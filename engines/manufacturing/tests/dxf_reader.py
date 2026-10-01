"""Petit lecteur de DXF ASCII pour les tests : paires (code, valeur), entités groupées par bloc."""

from dataclasses import dataclass, field

type Pairs = list[tuple[int, str]]


@dataclass
class Entity:
    kind: str
    pairs: Pairs = field(default_factory=list)

    def first(self, code: int) -> str:
        return next(v for c, v in self.pairs if c == code)

    @property
    def layer(self) -> str:
        return self.first(8)


def read_pairs(content: bytes) -> Pairs:
    lines = content.decode("cp1252").split("\r\n")
    assert lines[-1] == "", "le fichier se termine par une fin de ligne"
    lines = lines[:-1]
    assert len(lines) % 2 == 0
    return [(int(lines[i]), lines[i + 1]) for i in range(0, len(lines), 2)]


def _entities(pairs: Pairs) -> list[Entity]:
    out: list[Entity] = []
    for code, value in pairs:
        if code == 0:
            out.append(Entity(value))
        elif out:
            out[-1].pairs.append((code, value))
    return out


def sections(content: bytes) -> dict[str, list[Entity]]:
    """Entités de chaque section (`0 SECTION` / `0 ENDSEC`), dans l'ordre."""
    result: dict[str, list[Entity]] = {}
    pairs = read_pairs(content)
    index = 0
    while index < len(pairs):
        if pairs[index] == (0, "SECTION"):
            name = pairs[index + 1][1]
            end = pairs.index((0, "ENDSEC"), index)
            result[name] = _entities(pairs[index + 2 : end])
            index = end
        index += 1
    return result


def header(content: bytes) -> dict[str, Pairs]:
    pairs = read_pairs(content)
    start = pairs.index((2, "HEADER"))
    end = pairs.index((0, "ENDSEC"), start)
    out: dict[str, Pairs] = {}
    current: Pairs = []
    for code, value in pairs[start + 1 : end]:
        if code == 9:
            current = out.setdefault(value, [])
        else:
            current.append((code, value))
    return out


def blocks(content: bytes) -> dict[str, list[Entity]]:
    """Entités de chaque bloc, par nom (hors `BLOCK` et `ENDBLK`)."""
    result: dict[str, list[Entity]] = {}
    current: list[Entity] | None = None
    for entity in sections(content)["BLOCKS"]:
        if entity.kind == "BLOCK":
            current = result.setdefault(entity.first(2), [])
        elif entity.kind == "ENDBLK":
            current = None
        elif current is not None:
            current.append(entity)
    return result
