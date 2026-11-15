"""Pure CIELAB (D65) color-space math and CIEDE2000 perceptual distance."""

import math
import re
from collections.abc import Sequence

from app.domain.exceptions import ColorTokenNotFoundError, InvalidColorError
from app.domain.models import HSL, ColorMatchResult, ColorToken, LabColor

_HEX_RE = re.compile(r"^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")

# D65 standard illuminant reference white
_REF_X = 95.047
_REF_Y = 100.000
_REF_Z = 108.883


def normalize_hex(hex_str: str) -> str:
    """Validate and normalize a hex color string to uppercase #RRGGBB."""
    match = _HEX_RE.match(hex_str.strip())
    if not match:
        raise InvalidColorError(f"Invalid hex color: {hex_str!r}")
    raw = match.group(1).upper()
    if len(raw) == 3:
        raw = "".join(ch * 2 for ch in raw)
    return f"#{raw}"


def hex_to_rgb(hex_str: str) -> tuple[int, int, int]:
    """Convert #RRGGBB or #RGB to an (R, G, B) tuple in 0..255."""
    normalized = normalize_hex(hex_str)
    return (
        int(normalized[1:3], 16),
        int(normalized[3:5], 16),
        int(normalized[5:7], 16),
    )


def rgb_to_hsl(r: int, g: int, b: int) -> HSL:
    """Convert sRGB (0..255) to HSL (h: 0..360, s: 0..100, l: 0..100)."""
    rf, gf, bf = r / 255.0, g / 255.0, b / 255.0
    c_max = max(rf, gf, bf)
    c_min = min(rf, gf, bf)
    delta = c_max - c_min

    l_val = (c_max + c_min) / 2.0
    if delta == 0.0:
        h_val = 0.0
        s_val = 0.0
    else:
        s_val = delta / (1.0 - abs(2.0 * l_val - 1.0))
        if c_max == rf:
            h_val = 60.0 * (((gf - bf) / delta) % 6.0)
        elif c_max == gf:
            h_val = 60.0 * (((bf - rf) / delta) + 2.0)
        else:
            h_val = 60.0 * (((rf - gf) / delta) + 4.0)

    return HSL(
        h=round(h_val % 360.0, 2),
        s=round(s_val * 100.0, 2),
        l=round(l_val * 100.0, 2),
    )


def _srgb_channel_to_linear(c: float) -> float:
    if c <= 0.04045:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4


def _lab_f(t: float) -> float:
    delta = 6.0 / 29.0
    if t > delta**3:
        return t ** (1.0 / 3.0)
    return (t / (3.0 * delta * delta)) + (4.0 / 29.0)


def rgb_to_lab(r: int, g: int, b: int) -> LabColor:
    """Convert sRGB (0..255) to CIELAB under D65 illuminant."""
    rl = _srgb_channel_to_linear(r / 255.0)
    gl = _srgb_channel_to_linear(g / 255.0)
    bl = _srgb_channel_to_linear(b / 255.0)

    # sRGB to XYZ (D65, scaled 0..100)
    x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) * 100.0
    y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750) * 100.0
    z = (rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) * 100.0

    fx = _lab_f(x / _REF_X)
    fy = _lab_f(y / _REF_Y)
    fz = _lab_f(z / _REF_Z)

    l_star = 116.0 * fy - 16.0
    a_star = 500.0 * (fx - fy)
    b_star = 200.0 * (fy - fz)

    return LabColor(L=round(l_star, 4), a=round(a_star, 4), b=round(b_star, 4))


def hex_to_lab(hex_str: str) -> LabColor:
    """Convert hex color directly to CIELAB."""
    r, g, b = hex_to_rgb(hex_str)
    return rgb_to_lab(r, g, b)


def delta_e_76(lab1: LabColor, lab2: LabColor) -> float:
    """Compute Euclidean CIE76 distance between two LabColor values."""
    return math.sqrt(
        (lab1.L - lab2.L) ** 2 + (lab1.a - lab2.a) ** 2 + (lab1.b - lab2.b) ** 2
    )


def delta_e_2000(lab1: LabColor, lab2: LabColor) -> float:
    """Compute CIEDE2000 perceptual color difference (kL=kC=kH=1)."""
    l1, a1, b1 = lab1.L, lab1.a, lab1.b
    l2, a2, b2 = lab2.L, lab2.a, lab2.b

    c1 = math.sqrt(a1 * a1 + b1 * b1)
    c2 = math.sqrt(a2 * a2 + b2 * b2)
    c_bar = 0.5 * (c1 + c2)

    c_bar7 = c_bar**7
    g = 0.5 * (1.0 - math.sqrt(c_bar7 / (c_bar7 + 25.0**7)))

    a1_prime = (1.0 + g) * a1
    a2_prime = (1.0 + g) * a2

    c1_prime = math.sqrt(a1_prime * a1_prime + b1 * b1)
    c2_prime = math.sqrt(a2_prime * a2_prime + b2 * b2)

    def _hue_angle(b_val: float, a_prime: float) -> float:
        if b_val == 0.0 and a_prime == 0.0:
            return 0.0
        angle = math.degrees(math.atan2(b_val, a_prime))
        return angle + 360.0 if angle < 0.0 else angle

    h1_prime = _hue_angle(b1, a1_prime)
    h2_prime = _hue_angle(b2, a2_prime)

    delta_l_prime = l2 - l1
    delta_c_prime = c2_prime - c1_prime

    c_prod = c1_prime * c2_prime
    if c_prod == 0.0:
        delta_h_prime = 0.0
    else:
        dh = h2_prime - h1_prime
        if abs(dh) <= 180.0:
            delta_h_prime = dh
        elif dh > 180.0:
            delta_h_prime = dh - 360.0
        else:
            delta_h_prime = dh + 360.0

    delta_big_h_prime = 2.0 * math.sqrt(c_prod) * math.sin(math.radians(delta_h_prime / 2.0))

    l_bar_prime = 0.5 * (l1 + l2)
    c_bar_prime = 0.5 * (c1_prime + c2_prime)

    if c_prod == 0.0:
        h_bar_prime = h1_prime + h2_prime
    else:
        h_sum = h1_prime + h2_prime
        if abs(h1_prime - h2_prime) <= 180.0:
            h_bar_prime = 0.5 * h_sum
        elif h_sum < 360.0:
            h_bar_prime = 0.5 * (h_sum + 360.0)
        else:
            h_bar_prime = 0.5 * (h_sum - 360.0)

    t = (
        1.0
        - 0.17 * math.cos(math.radians(h_bar_prime - 30.0))
        + 0.24 * math.cos(math.radians(2.0 * h_bar_prime))
        + 0.32 * math.cos(math.radians(3.0 * h_bar_prime + 6.0))
        - 0.20 * math.cos(math.radians(4.0 * h_bar_prime - 63.0))
    )

    delta_theta = 30.0 * math.exp(-(((h_bar_prime - 275.0) / 25.0) ** 2))
    c_bar_prime7 = c_bar_prime**7
    r_c = 2.0 * math.sqrt(c_bar_prime7 / (c_bar_prime7 + 25.0**7))

    l_term = (l_bar_prime - 50.0) ** 2
    s_l = 1.0 + (0.015 * l_term) / math.sqrt(20.0 + l_term)
    s_c = 1.0 + 0.045 * c_bar_prime
    s_h = 1.0 + 0.015 * c_bar_prime * t
    r_t = -math.sin(math.radians(2.0 * delta_theta)) * r_c

    return round(
        math.sqrt(
            (delta_l_prime / s_l) ** 2
            + (delta_c_prime / s_c) ** 2
            + (delta_big_h_prime / s_h) ** 2
            + r_t * (delta_c_prime / s_c) * (delta_big_h_prime / s_h)
        ),
        4,
    )


def find_nearest_color_token(
    hex_str: str, tokens: Sequence[ColorToken]
) -> ColorMatchResult:
    """Snap an arbitrary hex color to the perceptually closest ColorToken via CIEDE2000."""
    if not tokens:
        raise ColorTokenNotFoundError("Cannot match color against an empty palette.")
    normalized = normalize_hex(hex_str)
    target_lab = hex_to_lab(normalized)

    best_token = tokens[0]
    best_distance = delta_e_2000(target_lab, best_token.lab)
    for token in tokens[1:]:
        dist = delta_e_2000(target_lab, token.lab)
        if dist < best_distance:
            best_distance = dist
            best_token = token

    return ColorMatchResult(
        input_hex=normalized,
        matched_token=best_token,
        delta_e=best_distance,
    )
