from app.reconcile import check_reconciliation


def test_ok_when_balances_missing():
    ok, note = check_reconciliation([], None, None)
    assert ok is True
    assert "skipped" in note


def test_ok_when_sums_match():
    txs = [
        {"amount": 100.0, "direction": "credit"},
        {"amount": 40.0, "direction": "debit"},
    ]
    ok, note = check_reconciliation(txs, opening_balance=500.0, closing_balance=560.0)
    assert ok is True
    assert note is None


def test_flags_mismatch_beyond_tolerance():
    txs = [{"amount": 40.0, "direction": "debit"}]
    ok, note = check_reconciliation(txs, opening_balance=500.0, closing_balance=560.0)
    assert ok is False
    assert "review" in note.lower()
