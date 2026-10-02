"""Les références golden s'écrivent en LF et se lisent sans traduction de fins de ligne."""

from pathlib import Path

from tests.golden_files import read_text_exact, write_text_lf

GOLDEN = Path(__file__).parent.parent / "golden"


def test_write_text_lf_never_produces_crlf(tmp_path: Path) -> None:
    target = tmp_path / "ref.json"
    write_text_lf(target, "a\r\nb\nc\r\n")
    assert target.read_bytes() == b"a\nb\nc\n"


def test_read_text_exact_keeps_crlf(tmp_path: Path) -> None:
    target = tmp_path / "ref.txt"
    target.write_bytes(b"a\r\nb\n")
    assert read_text_exact(target) == "a\r\nb\n"


def test_text_references_are_lf_and_dxf_is_crlf() -> None:
    for name in ("straight-skirt-cut-pattern.json", "straight-skirt.svg"):
        assert b"\r" not in (GOLDEN / name).read_bytes(), name
    assert b"\r\n" in (GOLDEN / "straight-skirt.dxf").read_bytes()
