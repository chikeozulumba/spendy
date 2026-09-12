TOLERANCE = 0.01  # currency units; accounts for rounding in extracted amounts


def check_reconciliation(
    transactions: list[dict],
    opening_balance: float | None,
    closing_balance: float | None,
) -> tuple[bool, str | None]:
    """Compares the sum of extracted transactions against the stated
    opening/closing balance delta, if both are available. Never blocks
    processing — only surfaces a warning for the user to review."""
    if opening_balance is None or closing_balance is None:
        return True, "No opening/closing balance found on the statement; reconciliation skipped."

    net = sum(
        (t["amount"] if t["direction"] == "credit" else -t["amount"]) for t in transactions
    )
    expected_net = closing_balance - opening_balance
    diff = abs(net - expected_net)

    if diff <= TOLERANCE:
        return True, None

    return False, (
        f"Parsed transactions imply a net change of {net:.2f}, but the statement's "
        f"opening/closing balances imply {expected_net:.2f} (difference of {diff:.2f}). "
        "Some transactions may be missing or misparsed — please review."
    )
