from app.redact import redact_account_numbers


def test_redacts_grouped_card_number():
    text = "Card ending 1234 5678 9012 3456 was charged"
    assert "1234 5678 9012 3456" not in redact_account_numbers(text)


def test_redacts_bare_long_account_number():
    text = "Account 123456789012 balance"
    assert "123456789012" not in redact_account_numbers(text)


def test_redacts_iban():
    text = "IBAN GB29NWBK60161331926819 transfer"
    assert "GB29NWBK60161331926819" not in redact_account_numbers(text)


def test_does_not_redact_dates():
    text = "01-02-2024 GROCERY STORE 42.50"
    assert "01-02-2024" in redact_account_numbers(text)


def test_does_not_redact_amounts():
    text = "Payment of 1234.56 to Landlord"
    assert "1234.56" in redact_account_numbers(text)
