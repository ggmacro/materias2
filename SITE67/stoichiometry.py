from __future__ import annotations

import math
import re
from collections import defaultdict
from fractions import Fraction
from functools import reduce
from typing import Any

from material_simulator import LOCAL_MATERIALS


STATE_SUFFIX_RE = re.compile(r"\((aq|s|l|g|cr|solid|liquid|gas)\)$", re.IGNORECASE)
ARROW_RE = re.compile(r"\s*(?:->|=>|=|→)\s*")


def gcd_many(values: list[int]) -> int:
    values = [abs(value) for value in values if value]
    if not values:
        return 1
    return reduce(math.gcd, values)


def lcm(a: int, b: int) -> int:
    return abs(a * b) // math.gcd(a, b) if a and b else 1


def lcm_many(values: list[int]) -> int:
    return reduce(lcm, values, 1)


def atomic_masses() -> dict[str, float]:
    masses: dict[str, float] = {}
    for material in LOCAL_MATERIALS.values():
        if (
            material.atomic_number > 0
            and material.atomic_mass_u > 0
            and material.symbol
            and material.formula == material.symbol
        ):
            masses[material.symbol] = material.atomic_mass_u
    masses.setdefault("D", 2.014)
    masses.setdefault("T", 3.016)
    return masses


ATOMIC_MASSES = atomic_masses()


def strip_species_token(token: str) -> str:
    formula = token.strip()
    formula = STATE_SUFFIX_RE.sub("", formula).strip()
    formula = re.sub(r"^\s*\d+(?:/\d+)?(?:\.\d+)?\s*", "", formula)
    return formula.replace(" ", "")


def parse_number(text: str, index: int) -> tuple[int, int]:
    start = index
    while index < len(text) and text[index].isdigit():
        index += 1
    if start == index:
        return 1, index
    return int(text[start:index]), index


def merge_counts(target: dict[str, int], source: dict[str, int], multiplier: int = 1) -> None:
    for element, amount in source.items():
        target[element] += amount * multiplier


def parse_formula_group(text: str, index: int = 0, closing: str = "") -> tuple[dict[str, int], int]:
    counts: dict[str, int] = defaultdict(int)
    pairs = {"(": ")", "[": "]", "{": "}"}

    while index < len(text):
        char = text[index]
        if closing and char == closing:
            return dict(counts), index + 1
        if char in pairs:
            group_counts, index = parse_formula_group(text, index + 1, pairs[char])
            multiplier, index = parse_number(text, index)
            merge_counts(counts, group_counts, multiplier)
            continue
        if char in ")]}":
            raise ValueError(f"Parenteses incorretos em {text}.")
        if char.isupper():
            symbol = char
            index += 1
            while index < len(text) and text[index].islower():
                symbol += text[index]
                index += 1
            amount, index = parse_number(text, index)
            counts[symbol] += amount
            continue
        raise ValueError(f"Caractere invalido em formula quimica: {char}.")

    if closing:
        raise ValueError(f"Parenteses nao fechado em {text}.")
    return dict(counts), index


def parse_formula(formula: str) -> dict[str, int]:
    formula = strip_species_token(formula)
    if not formula:
        raise ValueError("Formula vazia.")
    formula = formula.replace("·", ".")
    total: dict[str, int] = defaultdict(int)

    for part in formula.split("."):
        if not part:
            continue
        match = re.match(r"^(\d+)([A-Z].*)$", part)
        multiplier = int(match.group(1)) if match else 1
        formula_part = match.group(2) if match else part
        counts, index = parse_formula_group(formula_part)
        if index != len(formula_part):
            raise ValueError(f"Formula nao reconhecida: {formula}.")
        merge_counts(total, counts, multiplier)

    unknown = sorted(element for element in total if element not in ATOMIC_MASSES)
    if unknown:
        raise ValueError(f"Elemento sem massa atomica cadastrada: {', '.join(unknown)}.")
    return dict(total)


def molar_mass(formula: str) -> float:
    return sum(ATOMIC_MASSES[element] * amount for element, amount in parse_formula(formula).items())


def parse_equation(equation: str) -> tuple[list[str], list[str]]:
    parts = ARROW_RE.split(equation.strip(), maxsplit=1)
    if len(parts) != 2:
        raise ValueError("Use uma equacao com '=' ou '->', por exemplo: H2 + O2 = H2O.")
    reactants = [strip_species_token(item) for item in parts[0].split("+") if item.strip()]
    products = [strip_species_token(item) for item in parts[1].split("+") if item.strip()]
    if not reactants or not products:
        raise ValueError("A equacao precisa ter reagentes e produtos.")
    return reactants, products


def rref(matrix: list[list[Fraction]]) -> tuple[list[list[Fraction]], list[int]]:
    rows = len(matrix)
    cols = len(matrix[0]) if rows else 0
    mat = [row[:] for row in matrix]
    pivot_cols: list[int] = []
    pivot_row = 0

    for col in range(cols):
        pivot = None
        for row in range(pivot_row, rows):
            if mat[row][col] != 0:
                pivot = row
                break
        if pivot is None:
            continue
        mat[pivot_row], mat[pivot] = mat[pivot], mat[pivot_row]
        divisor = mat[pivot_row][col]
        mat[pivot_row] = [value / divisor for value in mat[pivot_row]]
        for row in range(rows):
            if row == pivot_row or mat[row][col] == 0:
                continue
            factor = mat[row][col]
            mat[row] = [
                mat[row][item] - factor * mat[pivot_row][item]
                for item in range(cols)
            ]
        pivot_cols.append(col)
        pivot_row += 1
        if pivot_row == rows:
            break

    return mat, pivot_cols


def nullspace_vector(matrix: list[list[Fraction]]) -> list[Fraction]:
    reduced, pivot_cols = rref(matrix)
    cols = len(matrix[0]) if matrix else 0
    free_cols = [col for col in range(cols) if col not in pivot_cols]
    if not free_cols:
        raise ValueError("Nao foi possivel balancear: a equacao nao conserva os atomos.")

    candidates: list[list[Fraction]] = []
    for free_col in free_cols:
        vector = [Fraction(0) for _ in range(cols)]
        vector[free_col] = Fraction(1)
        for row_index in range(len(pivot_cols) - 1, -1, -1):
            pivot_col = pivot_cols[row_index]
            total = Fraction(0)
            for col in free_cols:
                total += reduced[row_index][col] * vector[col]
            vector[pivot_col] = -total
        candidates.append(vector)

    vector = next((item for item in candidates if all(value != 0 for value in item)), candidates[0])
    if all(value < 0 for value in vector):
        vector = [-value for value in vector]
    if not all(value > 0 for value in vector):
        raise ValueError("Nao foi possivel balancear usando todas as substancias informadas.")
    return vector


def balance_equation(reactants: list[str], products: list[str]) -> list[int]:
    species = [*reactants, *products]
    parsed = [parse_formula(formula) for formula in species]
    elements = sorted({element for counts in parsed for element in counts})
    matrix: list[list[Fraction]] = []

    for element in elements:
        row: list[Fraction] = []
        for index, counts in enumerate(parsed):
            sign = 1 if index < len(reactants) else -1
            row.append(Fraction(sign * counts.get(element, 0)))
        matrix.append(row)

    vector = nullspace_vector(matrix)
    multiplier = lcm_many([value.denominator for value in vector])
    integers = [int(value * multiplier) for value in vector]
    divisor = gcd_many(integers)
    return [value // divisor for value in integers]


def parse_manual_coefficients(manual_coefficients: Any, species_count: int) -> list[int] | None:
    if manual_coefficients is None:
        return None
    if isinstance(manual_coefficients, str):
        text = manual_coefficients.strip()
        if not text:
            return None
        values = [item for item in re.split(r"[\s,;|]+", text) if item]
    elif isinstance(manual_coefficients, list):
        values = manual_coefficients
    else:
        raise ValueError("Coeficientes manuais devem ser uma lista ou texto, exemplo: 2,1,2.")

    if len(values) != species_count:
        raise ValueError(
            f"Informe {species_count} coeficientes, na mesma ordem da equacao."
        )

    coefficients = []
    for value in values:
        try:
            coefficient = int(value)
        except (TypeError, ValueError):
            raise ValueError("Use apenas coeficientes inteiros positivos.")
        if coefficient <= 0:
            raise ValueError("Use apenas coeficientes inteiros positivos.")
        coefficients.append(coefficient)
    return coefficients


def validate_coefficients(
    reactants: list[str],
    products: list[str],
    coefficients: list[int],
) -> None:
    species = [*reactants, *products]
    totals: dict[str, int] = defaultdict(int)
    for index, formula in enumerate(species):
        sign = 1 if index < len(reactants) else -1
        for element, amount in parse_formula(formula).items():
            totals[element] += sign * amount * coefficients[index]

    imbalanced = {element: total for element, total in totals.items() if total != 0}
    if imbalanced:
        details = ", ".join(f"{element}: {total}" for element, total in sorted(imbalanced.items()))
        raise ValueError(f"Balanceamento manual invalido; atomos nao conservados ({details}).")


def format_balanced_equation(reactants: list[str], products: list[str], coefficients: list[int]) -> str:
    species = [*reactants, *products]

    def part(index: int) -> str:
        coefficient = coefficients[index]
        prefix = "" if coefficient == 1 else f"{coefficient} "
        return f"{prefix}{species[index]}"

    left = " + ".join(part(index) for index in range(len(reactants)))
    right = " + ".join(part(index) for index in range(len(reactants), len(species)))
    return f"{left} = {right}"


def find_base_index(species: list[str], base_species: str) -> int:
    base = strip_species_token(base_species) if base_species else ""
    if base:
        for index, formula in enumerate(species):
            if formula.lower() == base.lower():
                return index
    return 0


def calculate_stoichiometry(
    equation: str,
    quantity: Any = 1,
    unit: str = "mol",
    base_species: str = "",
    manual_coefficients: Any = None,
) -> dict[str, Any]:
    reactants, products = parse_equation(equation)
    species = [*reactants, *products]
    coefficients = parse_manual_coefficients(manual_coefficients, len(species))
    mode = "manual"
    if coefficients is None:
        coefficients = balance_equation(reactants, products)
        mode = "automatico"
    else:
        validate_coefficients(reactants, products, coefficients)
    masses = [molar_mass(formula) for formula in species]
    base_index = find_base_index(species, base_species)
    unit = unit if unit in {"mol", "g"} else "mol"

    try:
        quantity_value = float(quantity)
    except (TypeError, ValueError):
        quantity_value = 1.0
    quantity_value = max(0.0, quantity_value)
    base_moles = quantity_value if unit == "mol" else quantity_value / masses[base_index]
    reaction_extent = base_moles / coefficients[base_index] if coefficients[base_index] else 0.0

    records = []
    for index, formula in enumerate(species):
        moles = reaction_extent * coefficients[index]
        records.append(
            {
                "formula": formula,
                "lado": "reagente" if index < len(reactants) else "produto",
                "coeficiente": coefficients[index],
                "massa_molar_g_mol": round(masses[index], 4),
                "massa_por_equacao_g": round(masses[index] * coefficients[index], 4),
                "mols_calculados": round(moles, 6),
                "massa_calculada_g": round(moles * masses[index], 6),
                "atomos": parse_formula(formula),
            }
        )

    return {
        "equacao_original": equation,
        "equacao_balanceada": format_balanced_equation(reactants, products, coefficients),
        "modo_balanceamento": mode,
        "coeficientes": coefficients,
        "base": {
            "formula": species[base_index],
            "quantidade": quantity_value,
            "unidade": unit,
            "mols": round(base_moles, 6),
        },
        "substancias": records,
        "observacao": (
            "calculo estequiometrico por balanceamento manual validado"
            if mode == "manual"
            else "calculo estequiometrico teorico por conservacao atomica e massas molares"
        ),
    }
