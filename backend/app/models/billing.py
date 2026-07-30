"""
Pydantic models for the raw billing log schema.
Validates every field and rejects malformed records with actionable messages.
"""
from __future__ import annotations
from pydantic import BaseModel, field_validator, model_validator
from typing import Optional
from datetime import datetime

VALID_PAYMENT_MODES = {"cash", "card", "upi"}


class LineItem(BaseModel):
    drug_name: str
    qty: int
    unit_price_paise: int

    @field_validator("drug_name")
    @classmethod
    def drug_name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("drug_name must not be empty")
        return v.upper()

    @field_validator("qty")
    @classmethod
    def qty_positive(cls, v: int) -> int:
        if not isinstance(v, int) or v <= 0:
            raise ValueError(f"qty must be a positive integer, got {v!r}")
        return v

    @field_validator("unit_price_paise")
    @classmethod
    def price_non_negative(cls, v: int) -> int:
        if not isinstance(v, int) or v < 0:
            raise ValueError(f"unit_price_paise must be >= 0, got {v!r}")
        return v


class VisitRecord(BaseModel):
    clinic_id: str
    visit_id: str
    timestamp: datetime
    doctor_id: str
    line_items: list[LineItem]
    payment_mode: Optional[str] = None
    amount_paid_paise: int
    discount_paise: int = 0
    is_refund: bool = False

    @field_validator("clinic_id", "visit_id", "doctor_id")
    @classmethod
    def required_str(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field must not be empty")
        return v.strip()

    @field_validator("payment_mode")
    @classmethod
    def payment_mode_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v_lower = v.lower().strip()
            if v_lower not in VALID_PAYMENT_MODES:
                raise ValueError(
                    f"payment_mode must be one of {sorted(VALID_PAYMENT_MODES)}, "
                    f"got '{v}'"
                )
            return v_lower
        return v

    @field_validator("line_items")
    @classmethod
    def line_items_not_empty(cls, v: list[LineItem]) -> list[LineItem]:
        if not v:
            raise ValueError("line_items must contain at least one item")
        return v

    @field_validator("amount_paid_paise", "discount_paise")
    @classmethod
    def must_be_int(cls, v: int) -> int:
        if not isinstance(v, int):
            raise ValueError(f"Monetary fields must be integer paise, got {type(v).__name__}")
        return v

    @model_validator(mode="after")
    def validate_payment_mode_required(self) -> "VisitRecord":
        if not self.is_refund and self.payment_mode is None:
            raise ValueError(
                "payment_mode is required for non-refund transactions"
            )
        return self

    @model_validator(mode="after")
    def validate_refund_amount(self) -> "VisitRecord":
        if self.is_refund and self.amount_paid_paise > 0:
            raise ValueError(
                "Refund records must have a non-positive amount_paid_paise "
                f"(got {self.amount_paid_paise})"
            )
        if not self.is_refund and self.amount_paid_paise < 0:
            raise ValueError(
                "Non-refund amount_paid_paise must be >= 0 "
                f"(got {self.amount_paid_paise})"
            )
        return self
