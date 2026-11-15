"""Domain exceptions with zero framework dependencies."""


class DomainError(Exception):
    """Base exception for all domain-level errors."""


class InvalidColorError(DomainError):
    """Raised when a hex or color value cannot be parsed."""


class ColorTokenNotFoundError(DomainError):
    """Raised when a referenced ColorToken ID does not exist in the palette."""


class AIStylistUnavailableError(DomainError):
    """Raised when the AI stylist provider cannot be reached or has no models."""

    def __init__(self, message: str, setup_hint: str | None = None) -> None:
        super().__init__(message)
        self.setup_hint = setup_hint


class InvalidRecommendationError(DomainError):
    """Raised when a recommendation violates domain invariants."""
