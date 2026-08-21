import json

import pytest


CONTRACT_PATH = "contracts/ai_patent_guard.py"
APPROVED_REASON = "The candidate contains independently expressed original logic."
REJECTED_REASON = "The candidate reproduces substantial protected logic from the registry."


@pytest.fixture
def patent_guard(direct_vm, direct_deploy, direct_owner):
    direct_vm.sender = direct_owner
    return direct_deploy(CONTRACT_PATH)


def mock_audit(direct_vm, decision="APPROVED", reason=APPROVED_REASON, pattern=None):
    prompt_pattern = pattern or r".*Chief Judge for an on-chain intellectual property.*"
    direct_vm.mock_llm(
        prompt_pattern,
        json.dumps({"decision": decision, "reason": reason}),
    )


def register(patent_guard, title="Original Patent", specification="Original logic"):
    return patent_guard.register_and_audit_patent(title, specification)


def test_initial_state_is_empty_and_owned(
    patent_guard, direct_owner, direct_alice
):
    assert patent_guard.get_owner().as_bytes == bytes(direct_owner)
    assert patent_guard.is_registration_paused() is False
    assert patent_guard.get_registry_stats() == {
        "total_records": 0,
        "total_attempts": 0,
        "approved_records": 0,
        "rejected_records": 0,
    }
    assert patent_guard.get_submission_attempts(direct_alice) == 0
    assert patent_guard.get_remaining_attempts(direct_alice) == 3


def test_approved_submission_persists_complete_record(
    direct_vm, patent_guard, direct_alice
):
    direct_vm.sender = direct_alice
    direct_vm.warp("2026-01-02T03:04:05Z")
    mock_audit(direct_vm)

    patent_id = register(patent_guard, "Novel Router", "Route tasks by verified intent.")
    record = patent_guard.get_patent_record(patent_id)

    assert patent_id == 0
    assert record.inventor == direct_alice
    assert record.title == "Novel Router"
    assert record.specification_text == "Route tasks by verified intent."
    assert record.timestamp == 1767323045
    assert record.is_approved is True
    assert record.audit_reason == APPROVED_REASON


def test_rejected_submission_persists_auditable_record(
    direct_vm, patent_guard, direct_alice
):
    direct_vm.sender = direct_alice
    mock_audit(direct_vm, "REJECTED", REJECTED_REASON)

    patent_id = register(patent_guard, "Copied Router", "Copied protected logic")
    record = patent_guard.get_patent_record(patent_id)

    assert record.is_approved is False
    assert record.audit_reason == REJECTED_REASON
    assert patent_guard.get_registry_stats() == {
        "total_records": 1,
        "total_attempts": 1,
        "approved_records": 0,
        "rejected_records": 1,
    }


def test_submission_trims_outer_whitespace(direct_vm, patent_guard, direct_alice):
    direct_vm.sender = direct_alice
    mock_audit(direct_vm)

    patent_id = register(
        patent_guard,
        "  Trimmed Title  ",
        "\n  Trimmed specification.  \n",
    )
    record = patent_guard.get_patent_record(patent_id)

    assert record.title == "Trimmed Title"
    assert record.specification_text == "Trimmed specification."


def test_empty_title_reverts_without_consuming_attempt(
    direct_vm, patent_guard, direct_alice
):
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("Patent title cannot be empty"):
        register(patent_guard, "", "Valid specification")

    assert patent_guard.get_submission_attempts(direct_alice) == 0
    assert patent_guard.get_registry_stats()["total_records"] == 0


def test_whitespace_specification_reverts_without_consuming_attempt(
    direct_vm, patent_guard, direct_alice
):
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("Patent specification cannot be empty"):
        register(patent_guard, "Valid Title", " \n\t ")

    assert patent_guard.get_submission_attempts(direct_alice) == 0


def test_title_at_maximum_length_is_accepted(direct_vm, patent_guard, direct_alice):
    direct_vm.sender = direct_alice
    mock_audit(direct_vm)

    patent_id = register(patent_guard, "T" * 160, "Valid specification")

    assert patent_guard.get_patent_record(patent_id).title == "T" * 160


def test_title_over_maximum_length_reverts(direct_vm, patent_guard, direct_alice):
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("Patent title exceeds the maximum length"):
        register(patent_guard, "T" * 161, "Valid specification")

    assert patent_guard.get_submission_attempts(direct_alice) == 0


def test_specification_at_maximum_length_is_accepted(
    direct_vm, patent_guard, direct_alice
):
    direct_vm.sender = direct_alice
    mock_audit(direct_vm)

    patent_id = register(patent_guard, "Boundary Patent", "S" * 4000)

    assert len(patent_guard.get_patent_record(patent_id).specification_text) == 4000


def test_specification_over_maximum_length_reverts(
    direct_vm, patent_guard, direct_alice
):
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("Patent specification exceeds the maximum length"):
        register(patent_guard, "Boundary Patent", "S" * 4001)

    assert patent_guard.get_submission_attempts(direct_alice) == 0


def test_non_ascii_title_reverts(direct_vm, patent_guard, direct_alice):
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("Patent title must contain only printable ASCII text"):
        register(patent_guard, "Patent " + chr(233), "Valid specification")

    assert patent_guard.get_submission_attempts(direct_alice) == 0


def test_non_ascii_specification_reverts(direct_vm, patent_guard, direct_alice):
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("Patent specification must contain only ASCII text"):
        register(patent_guard, "Valid Patent", "Invalid " + chr(233))

    assert patent_guard.get_submission_attempts(direct_alice) == 0


def test_title_line_break_reverts(direct_vm, patent_guard, direct_alice):
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("Patent title must contain only printable ASCII text"):
        register(patent_guard, "Invalid\nTitle", "Valid specification")


def test_specification_control_character_reverts(
    direct_vm, patent_guard, direct_alice
):
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("Patent specification must contain only ASCII text"):
        register(patent_guard, "Valid Patent", "Invalid" + chr(0) + "specification")


def test_each_final_audit_consumes_one_attempt(direct_vm, patent_guard, direct_alice):
    direct_vm.sender = direct_alice
    mock_audit(direct_vm, "REJECTED", REJECTED_REASON)

    register(patent_guard, "Attempt One", "First specification")
    register(patent_guard, "Attempt Two", "Second specification")

    assert patent_guard.get_submission_attempts(direct_alice) == 2
    assert patent_guard.get_remaining_attempts(direct_alice) == 1
    assert patent_guard.get_registry_stats()["total_attempts"] == 2


def test_fourth_attempt_is_blocked_without_creating_record(
    direct_vm, patent_guard, direct_alice
):
    direct_vm.sender = direct_alice
    mock_audit(direct_vm)
    for index in range(3):
        register(
            patent_guard,
            "Patent " + str(index),
            "Specification " + str(index),
        )

    with direct_vm.expect_revert("Maximum submission attempts reached"):
        register(patent_guard, "Patent Four", "Fourth specification")

    assert patent_guard.get_submission_attempts(direct_alice) == 3
    assert patent_guard.get_remaining_attempts(direct_alice) == 0
    assert patent_guard.get_registry_stats()["total_records"] == 3


def test_attempt_limits_are_isolated_by_inventor(
    direct_vm, patent_guard, direct_alice, direct_bob
):
    mock_audit(direct_vm)
    direct_vm.sender = direct_alice
    for index in range(3):
        register(patent_guard, "Alice " + str(index), "Alice logic " + str(index))

    direct_vm.sender = direct_bob
    patent_id = register(patent_guard, "Bob Patent", "Bob independent logic")

    assert patent_guard.get_submission_attempts(direct_alice) == 3
    assert patent_guard.get_submission_attempts(direct_bob) == 1
    assert patent_guard.get_patent_record(patent_id).inventor == direct_bob


def test_paused_registry_blocks_submissions_without_consuming_attempt(
    direct_vm, patent_guard, direct_owner, direct_alice
):
    direct_vm.sender = direct_owner
    patent_guard.set_paused(True)
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("Patent registration is paused"):
        register(patent_guard)

    assert patent_guard.get_submission_attempts(direct_alice) == 0
    assert patent_guard.get_registry_stats()["total_records"] == 0


def test_non_owner_cannot_change_pause_state(
    direct_vm, patent_guard, direct_alice
):
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("Only the owner can perform this action"):
        patent_guard.set_paused(True)

    assert patent_guard.is_registration_paused() is False


def test_owner_can_pause_and_resume_registration(
    direct_vm, patent_guard, direct_owner, direct_alice
):
    direct_vm.sender = direct_owner
    patent_guard.set_paused(True)
    assert patent_guard.is_registration_paused() is True
    patent_guard.set_paused(False)
    assert patent_guard.is_registration_paused() is False

    direct_vm.sender = direct_alice
    mock_audit(direct_vm)
    assert register(patent_guard) == 0


def test_non_owner_cannot_transfer_ownership(
    direct_vm, patent_guard, direct_alice, direct_bob
):
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("Only the owner can perform this action"):
        patent_guard.transfer_ownership(direct_bob)


def test_zero_address_cannot_become_owner(
    direct_vm, patent_guard, direct_owner, direct_alice
):
    direct_vm.sender = direct_owner
    zero_address = type(direct_alice)(bytes(20))

    with direct_vm.expect_revert("New owner cannot be the zero address"):
        patent_guard.transfer_ownership(zero_address)

    assert patent_guard.get_owner().as_bytes == bytes(direct_owner)


def test_transferred_owner_exclusively_controls_admin_actions(
    direct_vm, patent_guard, direct_owner, direct_bob
):
    direct_vm.sender = direct_owner
    patent_guard.transfer_ownership(direct_bob)
    assert patent_guard.get_owner() == direct_bob

    with direct_vm.expect_revert("Only the owner can perform this action"):
        patent_guard.set_paused(True)

    direct_vm.sender = direct_bob
    patent_guard.set_paused(True)
    assert patent_guard.is_registration_paused() is True


def test_unknown_patent_id_reverts(direct_vm, patent_guard):
    with direct_vm.expect_revert("Patent record does not exist"):
        patent_guard.get_patent_record(0)


def test_lowercase_decision_and_whitespace_reason_are_normalized(
    direct_vm, patent_guard, direct_alice
):
    direct_vm.sender = direct_alice
    mock_audit(
        direct_vm,
        decision=" approved ",
        reason="  Original\nlogic\tconfirmed.  ",
    )

    record = patent_guard.get_patent_record(register(patent_guard))

    assert record.is_approved is True
    assert record.audit_reason == "Original logic confirmed."


def test_invalid_audit_decision_reverts_atomically(
    direct_vm, patent_guard, direct_alice
):
    direct_vm.sender = direct_alice
    mock_audit(direct_vm, "UNDETERMINED", "No decision")
    snapshot_id = direct_vm.snapshot()

    with direct_vm.expect_revert("[LLM_ERROR] Audit decision is invalid"):
        register(patent_guard)

    assert patent_guard.get_submission_attempts(direct_alice) == 1
    assert patent_guard.get_registry_stats()["total_records"] == 0
    direct_vm.revert(snapshot_id)
    assert patent_guard.get_submission_attempts(direct_alice) == 0


def test_non_object_audit_response_reverts_atomically(
    direct_vm, patent_guard, direct_alice
):
    direct_vm.sender = direct_alice
    direct_vm.mock_llm(
        r".*Chief Judge for an on-chain intellectual property.*",
        json.dumps(["APPROVED"]),
    )
    snapshot_id = direct_vm.snapshot()

    with direct_vm.expect_revert("[LLM_ERROR] Audit response must be a JSON object"):
        register(patent_guard)

    assert patent_guard.get_submission_attempts(direct_alice) == 1
    assert patent_guard.get_registry_stats()["total_records"] == 0
    direct_vm.revert(snapshot_id)
    assert patent_guard.get_submission_attempts(direct_alice) == 0


def test_missing_audit_field_reverts_atomically(
    direct_vm, patent_guard, direct_alice
):
    direct_vm.sender = direct_alice
    direct_vm.mock_llm(
        r".*Chief Judge for an on-chain intellectual property.*",
        json.dumps({"decision": "APPROVED"}),
    )

    with direct_vm.expect_revert("[LLM_ERROR] Audit response fields must be strings"):
        register(patent_guard)

    assert patent_guard.get_registry_stats()["total_records"] == 0


def test_non_ascii_audit_reason_reverts_atomically(
    direct_vm, patent_guard, direct_alice
):
    direct_vm.sender = direct_alice
    mock_audit(direct_vm, reason="Invalid " + chr(233) + " reason")
    snapshot_id = direct_vm.snapshot()

    with direct_vm.expect_revert("[LLM_ERROR] Audit reason must contain only ASCII text"):
        register(patent_guard)

    assert patent_guard.get_submission_attempts(direct_alice) == 1
    assert patent_guard.get_registry_stats()["total_records"] == 0
    direct_vm.revert(snapshot_id)
    assert patent_guard.get_submission_attempts(direct_alice) == 0


def test_oversized_audit_reason_reverts_atomically(
    direct_vm, patent_guard, direct_alice
):
    direct_vm.sender = direct_alice
    mock_audit(direct_vm, reason="R" * 401)
    snapshot_id = direct_vm.snapshot()

    with direct_vm.expect_revert("[LLM_ERROR] Audit reason exceeds the maximum length"):
        register(patent_guard)

    assert patent_guard.get_submission_attempts(direct_alice) == 1
    assert patent_guard.get_registry_stats()["total_records"] == 0
    direct_vm.revert(snapshot_id)
    assert patent_guard.get_submission_attempts(direct_alice) == 0


def test_approved_patents_are_included_in_later_audit_corpus(
    direct_vm, patent_guard, direct_alice
):
    direct_vm.sender = direct_alice
    mock_audit(direct_vm)
    register(patent_guard, "First Patent", "Distinctive first architecture")

    direct_vm.clear_mocks()
    mock_audit(
        direct_vm,
        pattern=r'.*Approved patents JSON: .*"title":"First Patent".*',
    )

    assert register(patent_guard, "Second Patent", "Independent second architecture") == 1


def test_rejected_patents_are_excluded_from_later_audit_corpus(
    direct_vm, patent_guard, direct_alice
):
    direct_vm.sender = direct_alice
    mock_audit(direct_vm, "REJECTED", REJECTED_REASON)
    register(patent_guard, "Rejected Patent", "Rejected architecture")

    direct_vm.clear_mocks()
    mock_audit(
        direct_vm,
        pattern=r".*Approved patents JSON: \[\]\nCandidate patent JSON:.*",
    )

    assert register(patent_guard, "Fresh Patent", "Fresh architecture") == 1


def test_registry_count_invariant_holds_across_mixed_decisions(
    direct_vm, patent_guard, direct_alice, direct_bob
):
    direct_vm.sender = direct_alice
    mock_audit(direct_vm)
    register(patent_guard, "Approved Patent", "Approved architecture")

    direct_vm.clear_mocks()
    direct_vm.sender = direct_bob
    mock_audit(direct_vm, "REJECTED", REJECTED_REASON)
    register(patent_guard, "Rejected Patent", "Rejected architecture")

    stats = patent_guard.get_registry_stats()
    assert stats["total_records"] == 2
    assert stats["approved_records"] + stats["rejected_records"] == 2
    assert stats["total_attempts"] == 2
