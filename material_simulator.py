"""
Simulador simples de materiais com catalogo local e API opcional.

O modelo faz uma triagem aproximada por regra de mistura. Ele e util para
prototipagem e pesquisa inicial, mas nao substitui ensaios de laboratorio,
DFT, CALPHAD, FEA ou dados cristalograficos validados.
"""

from __future__ import annotations

import math
import os
from dataclasses import asdict, dataclass
from typing import Any, Dict, Iterable, Optional

try:
    import requests
except ImportError:
    requests = None


@dataclass(frozen=True)
class Material:
    name: str
    formula: str
    symbol: str
    category: str
    atomic_number: int
    atomic_mass_u: float
    density_g_cm3: float
    elastic_modulus_gpa: float
    thermal_conductivity_w_mk: float
    electrical_conductivity_s_m: float
    band_gap_ev: float
    melting_point_c: float
    atomic_radius_pm: float
    electronegativity: float
    crystal_structure: str
    color: str
    hardness_vickers_hv: float = 0.0
    source: str = "local"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def m(
    name: str,
    formula: str,
    symbol: str,
    category: str,
    atomic_number: int,
    atomic_mass_u: float,
    density_g_cm3: float,
    elastic_modulus_gpa: float,
    thermal_conductivity_w_mk: float,
    electrical_conductivity_s_m: float,
    band_gap_ev: float,
    melting_point_c: float,
    atomic_radius_pm: float,
    electronegativity: float,
    crystal_structure: str,
    color: str,
    hardness_vickers_hv: Optional[float] = None,
) -> Material:
    if hardness_vickers_hv is None:
        hardness_vickers_hv = estimate_hardness_from_properties(
            category,
            elastic_modulus_gpa,
            melting_point_c,
        )
    return Material(
        name=name,
        formula=formula,
        symbol=symbol,
        category=category,
        atomic_number=atomic_number,
        atomic_mass_u=atomic_mass_u,
        density_g_cm3=density_g_cm3,
        elastic_modulus_gpa=elastic_modulus_gpa,
        thermal_conductivity_w_mk=thermal_conductivity_w_mk,
        electrical_conductivity_s_m=electrical_conductivity_s_m,
        band_gap_ev=band_gap_ev,
        melting_point_c=melting_point_c,
        atomic_radius_pm=atomic_radius_pm,
        electronegativity=electronegativity,
        crystal_structure=crystal_structure,
        color=color,
        hardness_vickers_hv=hardness_vickers_hv,
    )


def estimate_hardness_from_properties(
    category: str,
    elastic_modulus_gpa: float,
    melting_point_c: float,
) -> float:
    category = category.lower()
    if elastic_modulus_gpa <= 0:
        return 0.0
    factor = 2.0
    if "ceramico" in category or "carbeto" in category:
        factor = 7.0
    elif "nanomaterial" in category:
        factor = 5.0
    elif "semicondutor" in category:
        factor = 3.0
    elif "liga" in category:
        factor = 1.6
    elif "metal" in category:
        factor = 0.9
    thermal_bonus = 1.0 + max(0.0, min(melting_point_c, 2500.0)) / 10000.0
    return round(elastic_modulus_gpa * factor * thermal_bonus, 1)


LOCAL_MATERIALS: Dict[str, Material] = {
    "hidrogenio": m("Hidrogenio", "H", "H", "nao metal", 1, 1.008, 0.00009, 0, 0.18, 0, 0, -259.1, 53, 2.20, "molecular", "#7aa7ff"),
    "carbono": m("Carbono", "C", "C", "nao metal", 6, 12.011, 2.26, 10, 150, 2.0e4, 0, 3650, 70, 2.55, "hexagonal", "#2d2f33"),
    "grafeno": m("Grafeno", "C", "C", "nanomaterial", 6, 12.011, 2.20, 1000, 3000, 1.0e8, 0, 3650, 70, 2.55, "hexagonal 2D", "#202326"),
    "grafite": m("Grafite", "C", "C", "nao metal", 6, 12.011, 2.20, 10, 150, 1.0e5, 0, 3650, 70, 2.55, "hexagonal", "#34383d"),
    "magnesio": m("Magnesio", "Mg", "Mg", "metal alcalino-terroso", 12, 24.305, 1.74, 45, 160, 2.3e7, 0, 650, 145, 1.31, "hcp", "#9fb7c8"),
    "aluminio": m("Aluminio", "Al", "Al", "metal", 13, 26.982, 2.70, 69, 237, 3.77e7, 0, 660.3, 118, 1.61, "fcc", "#a8b7c7"),
    "silicio": m("Silicio", "Si", "Si", "metaloide", 14, 28.085, 2.33, 130, 149, 1.6e-3, 1.12, 1414, 111, 1.90, "diamante cubica", "#6f7f86"),
    "titanio": m("Titanio", "Ti", "Ti", "metal de transicao", 22, 47.867, 4.51, 116, 21.9, 2.4e6, 0, 1668, 147, 1.54, "hcp", "#9aa1aa"),
    "vanadio": m("Vanadio", "V", "V", "metal de transicao", 23, 50.942, 6.11, 128, 86, 5.0e6, 0, 1910, 134, 1.63, "bcc", "#8fa3ad"),
    "cromo": m("Cromo", "Cr", "Cr", "metal de transicao", 24, 51.996, 7.19, 279, 94, 7.9e6, 0, 1907, 128, 1.66, "bcc", "#8aa4bc"),
    "manganes": m("Manganes", "Mn", "Mn", "metal de transicao", 25, 54.938, 7.30, 198, 7.8, 6.2e5, 0, 1246, 127, 1.55, "cubica complexa", "#9b8f9d"),
    "ferro": m("Ferro", "Fe", "Fe", "metal de transicao", 26, 55.845, 7.87, 211, 80, 1.0e7, 0, 1538, 126, 1.83, "bcc", "#8d9496"),
    "cobalto": m("Cobalto", "Co", "Co", "metal de transicao", 27, 58.933, 8.90, 209, 63, 1.7e7, 0, 1495, 125, 1.88, "hcp", "#6f86aa"),
    "niquel": m("Niquel", "Ni", "Ni", "metal de transicao", 28, 58.693, 8.91, 200, 90, 1.43e7, 0, 1455, 124, 1.91, "fcc", "#a7a08a"),
    "cobre": m("Cobre", "Cu", "Cu", "metal de transicao", 29, 63.546, 8.96, 117, 401, 5.96e7, 0, 1084.6, 128, 1.90, "fcc", "#c56f37"),
    "zinco": m("Zinco", "Zn", "Zn", "metal de transicao", 30, 65.38, 7.14, 108, 116, 1.69e7, 0, 419.5, 134, 1.65, "hcp", "#9daab3"),
    "galio": m("Galio", "Ga", "Ga", "metal pos-transicao", 31, 69.723, 5.91, 9.8, 55, 7.1e6, 0, 29.8, 136, 1.81, "ortorrombica", "#8faeb7"),
    "germanio": m("Germanio", "Ge", "Ge", "metaloide", 32, 72.630, 5.32, 103, 60, 2.0, 0.67, 938.3, 122, 2.01, "diamante cubica", "#7f8c88"),
    "prata": m("Prata", "Ag", "Ag", "metal de transicao", 47, 107.868, 10.49, 83, 429, 6.30e7, 0, 961.8, 144, 1.93, "fcc", "#cfd6d8"),
    "estanho": m("Estanho", "Sn", "Sn", "metal pos-transicao", 50, 118.710, 7.31, 50, 67, 9.1e6, 0, 231.9, 140, 1.96, "tetragonal", "#aeb9bd"),
    "tungstenio": m("Tungstenio", "W", "W", "metal de transicao", 74, 183.84, 19.25, 411, 134, 1.79e7, 0, 3422, 139, 2.36, "bcc", "#78848a"),
    "ouro": m("Ouro", "Au", "Au", "metal de transicao", 79, 196.967, 19.32, 78, 317, 4.10e7, 0, 1064.2, 144, 2.54, "fcc", "#d6a83a"),
    "mercurio": m("Mercurio", "Hg", "Hg", "metal de transicao", 80, 200.592, 13.53, 0, 2, 1.0e6, 0, -38.8, 151, 2.00, "liquido", "#9aa6b2"),
    "chumbo": m("Chumbo", "Pb", "Pb", "metal pos-transicao", 82, 207.2, 11.34, 16, 35, 4.8e6, 0, 327.5, 175, 2.33, "fcc", "#6d7583"),
    "fosforo_negro": m("Fosforo negro", "P", "P", "semicondutor 2D", 15, 30.974, 2.69, 44, 12, 1.0e2, 0.3, 590, 98, 2.19, "ortorrombica em camadas", "#2b2630"),
    "bismuto": m("Bismuto", "Bi", "Bi", "metal pos-transicao", 83, 208.980, 9.78, 32, 7.97, 7.7e5, 0, 271.4, 156, 2.02, "romboedrica", "#b7a5ba"),
    "tecnecio": m("Tecnecio", "Tc", "Tc", "metal de transicao", 43, 98.0, 11.50, 290, 50.6, 6.7e6, 0, 2157, 136, 1.90, "hcp", "#8d95a6"),
    "telureto_bismuto": m("Telureto de bismuto", "Bi2Te3", "Bi2Te3", "semicondutor termoeletrico", 0, 800.76, 7.86, 44, 1.5, 1.0e5, 0.15, 585, 160, 2.10, "romboedrica em camadas", "#7d718d"),
    "telureto_chumbo": m("Telureto de chumbo", "PbTe", "PbTe", "semicondutor termoeletrico", 0, 334.8, 8.16, 57, 2.3, 2.0e4, 0.31, 924, 170, 2.25, "sal-gema fcc", "#59656f"),
    "telureto_cadmio": m("Telureto de cadmio", "CdTe", "CdTe", "semicondutor", 0, 240.0, 5.85, 52, 6.2, 1.0e-2, 1.50, 1092, 155, 2.10, "zinc blende", "#6b4f63"),
    "telureto_estanho": m("Telureto de estanho", "SnTe", "SnTe", "semicondutor topologico", 0, 246.3, 6.48, 50, 8.0, 1.0e5, 0.18, 806, 155, 2.10, "sal-gema fcc", "#6f7780"),
    "aco": m("Aco carbono", "Fe-C", "Fe", "liga", 0, 0, 7.85, 200, 50, 6.0e6, 0, 1425, 126, 1.83, "bcc/fcc", "#747c80"),
    "vidro": m("Vidro sodocalcico", "SiO2-Na2O-CaO", "Si", "ceramico", 0, 0, 2.50, 70, 0.84, 1.0e-12, 8.0, 1500, 111, 1.90, "amorfa", "#86c9d7"),
    "alumina": m("Alumina", "Al2O3", "Al", "ceramico", 0, 0, 3.95, 300, 30, 1.0e-12, 8.8, 2072, 118, 1.61, "corindon", "#dfe6ec"),
    "carbeto_silicio": m("Carbeto de silicio", "SiC", "Si", "ceramico", 0, 0, 3.21, 410, 120, 1.0e-6, 2.9, 2730, 111, 1.90, "zinc blende/hexagonal", "#5b676b"),
}


class MaterialsProjectClient:
    BASE_URL = "https://api.materialsproject.org/materials/summary"

    def __init__(self, api_key: Optional[str] = None) -> None:
        self.api_key = api_key or os.getenv("MP_API_KEY")

    def search_by_formula(self, formula: str) -> Optional[Material]:
        if not self.api_key or requests is None:
            return None

        headers = {"X-API-KEY": self.api_key}
        params = {
            "formula": formula,
            "fields": "formula_pretty,density,band_gap",
            "_limit": 1,
        }
        response = requests.get(self.BASE_URL, headers=headers, params=params, timeout=20)
        response.raise_for_status()
        data = response.json().get("data", [])
        if not data:
            return None

        item = data[0]
        pretty_formula = item.get("formula_pretty", formula)
        return Material(
            name=f"Materials Project: {pretty_formula}",
            formula=pretty_formula,
            symbol=pretty_formula[:2],
            category="api",
            atomic_number=0,
            atomic_mass_u=0,
            density_g_cm3=float(item.get("density") or 0.0),
            elastic_modulus_gpa=0.0,
            thermal_conductivity_w_mk=0.0,
            electrical_conductivity_s_m=0.0,
            band_gap_ev=float(item.get("band_gap") or 0.0),
            melting_point_c=0.0,
            atomic_radius_pm=100,
            electronegativity=0.0,
            crystal_structure="desconhecida",
            color="#7b8da6",
            source="materials_project",
        )


def get_material(query: str, client: MaterialsProjectClient) -> Material:
    key = query.strip().lower()
    if key in LOCAL_MATERIALS:
        return LOCAL_MATERIALS[key]

    api_material = client.search_by_formula(query)
    if api_material:
        return api_material

    available = ", ".join(sorted(LOCAL_MATERIALS))
    raise ValueError(f"Material '{query}' nao encontrado. Materiais locais: {available}.")


def normalize_fractions(composition: Dict[str, float]) -> Dict[str, float]:
    total = sum(composition.values())
    if total <= 0:
        raise ValueError("A soma das fracoes deve ser maior que zero.")
    return {name: fraction / total for name, fraction in composition.items()}


def weighted_average(materials: Iterable[tuple[Material, float]], attr: str) -> float:
    values = []
    for material, fraction in materials:
        value = getattr(material, attr)
        if value > 0:
            values.append(value * fraction)
    return sum(values)


def estimate_seebeck_uv_k(material: Material) -> float:
    formula = material.formula.lower()
    category = material.category.lower()
    name = material.name.lower()

    values = {
        "bi2te3": 220.0,
        "pbte": 180.0,
        "cdte": 100.0,
        "snte": 120.0,
        "sic": 250.0,
        "si": 440.0,
        "ge": 330.0,
        "p": 350.0,
        "al2o3": 0.0,
    }
    if formula in values:
        return values[formula]
    if "grafeno" in name or "graphene" in name:
        return 80.0
    if "semicondutor" in category or material.band_gap_ev > 0.1:
        return 180.0
    if "metal" in category or material.electrical_conductivity_s_m > 1.0e6:
        return 8.0
    if "ceramico" in category:
        return 40.0
    return 25.0


def thermoelectric_values(material: Material) -> dict[str, float]:
    seebeck_uv_k = estimate_seebeck_uv_k(material)
    seebeck_v_k = seebeck_uv_k * 1.0e-6
    sigma = material.electrical_conductivity_s_m
    thermal = max(material.thermal_conductivity_w_mk, 1.0e-9)
    power_factor = seebeck_v_k * seebeck_v_k * sigma
    zt_300k = power_factor * 300 / thermal
    return {
        "seebeck_uv_k": seebeck_uv_k,
        "fator_potencia_w_mk2": power_factor,
        "zt_300k": zt_300k,
    }


def dominant_structure(selected: list[tuple[Material, float]]) -> str:
    totals: dict[str, float] = {}
    for material, fraction in selected:
        totals[material.crystal_structure] = totals.get(material.crystal_structure, 0) + fraction
    return max(totals.items(), key=lambda item: item[1])[0]


def estimate_lattice_a_angstrom(material: Material) -> float:
    radius_a = max(material.atomic_radius_pm, 80) / 100
    structure = material.crystal_structure.lower()
    if "fcc" in structure:
        return 2 * math.sqrt(2) * radius_a
    if "bcc" in structure:
        return 4 * radius_a / math.sqrt(3)
    if "diamante" in structure:
        return 8 * radius_a / math.sqrt(3)
    if "hcp" in structure or "hexagonal" in structure:
        return 2 * radius_a
    return 2.5 * radius_a


def cubic_hkl_for_structure(structure: str) -> list[tuple[int, int, int, float]]:
    structure = structure.lower()
    if "fcc" in structure:
        return [(1, 1, 1, 100), (2, 0, 0, 54), (2, 2, 0, 32), (3, 1, 1, 28), (2, 2, 2, 14), (4, 0, 0, 10)]
    if "bcc" in structure:
        return [(1, 1, 0, 100), (2, 0, 0, 22), (2, 1, 1, 35), (2, 2, 0, 15), (3, 1, 0, 9), (2, 2, 2, 6)]
    if "diamante" in structure:
        return [(1, 1, 1, 100), (2, 2, 0, 55), (3, 1, 1, 32), (4, 0, 0, 9), (3, 3, 1, 18), (4, 2, 2, 12)]
    if "hcp" in structure or "hexagonal" in structure:
        return [(1, 0, 0, 42), (0, 0, 2, 55), (1, 0, 1, 100), (1, 0, 2, 35), (1, 1, 0, 28), (1, 0, 3, 18)]
    return [(1, 0, 0, 70), (1, 1, 0, 45), (1, 1, 1, 32), (2, 0, 0, 22), (2, 1, 0, 15)]


def estimate_xrd_peaks(selected: list[tuple[Material, float]]) -> list[dict[str, Any]]:
    wavelength_a = 1.5406  # Cu K-alpha, angstrom
    peaks: list[dict[str, Any]] = []

    for material, fraction in selected:
        a = estimate_lattice_a_angstrom(material)
        for h, k, l, base_intensity in cubic_hkl_for_structure(material.crystal_structure):
            d_spacing = a / math.sqrt(h * h + k * k + l * l)
            ratio = wavelength_a / (2 * d_spacing)
            if ratio <= 0 or ratio >= 1:
                continue
            two_theta = 2 * math.degrees(math.asin(ratio))
            if 5 <= two_theta <= 95:
                peaks.append(
                    {
                        "material": material.name,
                        "symbol": material.symbol,
                        "hkl": f"{h}{k}{l}",
                        "two_theta_deg": round(two_theta, 2),
                        "d_spacing_a": round(d_spacing, 4),
                        "intensity": round(base_intensity * fraction, 2),
                        "color": material.color,
                    }
                )

    peaks.sort(key=lambda peak: peak["two_theta_deg"])
    max_intensity = max((peak["intensity"] for peak in peaks), default=1)
    for peak in peaks:
        peak["relative_intensity"] = round(100 * peak["intensity"] / max_intensity, 2)
    return peaks[:24]


def simulate_composite(
    composition: Dict[str, float],
    client: Optional[MaterialsProjectClient] = None,
) -> Dict[str, Any]:
    client = client or MaterialsProjectClient()
    fractions = normalize_fractions(composition)
    selected = [(get_material(name, client), frac) for name, frac in fractions.items()]

    density = weighted_average(selected, "density_g_cm3")
    modulus = weighted_average(selected, "elastic_modulus_gpa")
    thermal = weighted_average(selected, "thermal_conductivity_w_mk")
    electrical = weighted_average(selected, "electrical_conductivity_s_m")
    band_gap = weighted_average(selected, "band_gap_ev")
    melting_point = weighted_average(selected, "melting_point_c")
    atomic_radius = weighted_average(selected, "atomic_radius_pm")
    electronegativity = weighted_average(selected, "electronegativity")
    hardness = weighted_average(selected, "hardness_vickers_hv")
    seebeck = sum(estimate_seebeck_uv_k(material) * fraction for material, fraction in selected)
    seebeck_v_k = seebeck * 1.0e-6
    power_factor = seebeck_v_k * seebeck_v_k * electrical
    zt_300k = power_factor * 300 / thermal if thermal > 0 else 0

    return {
        "formula_aproximada": " + ".join(
            f"{fraction:.2f}*{material.formula}" for material, fraction in selected
        ),
        "densidade_g_cm3": round(density, 3),
        "modulo_elastico_gpa": round(modulus, 3),
        "condutividade_termica_w_mk": round(thermal, 3),
        "condutividade_eletrica_s_m": round(electrical, 6),
        "resistividade_ohm_m": round(1 / electrical, 12) if electrical > 0 else "n/a",
        "band_gap_ev": round(band_gap, 3),
        "ponto_fusao_c": round(melting_point, 1),
        "raio_atomico_pm": round(atomic_radius, 1),
        "eletronegatividade_media": round(electronegativity, 3),
        "dureza_vickers_hv": round(hardness, 1),
        "seebeck_uv_k": round(seebeck, 3),
        "fator_potencia_w_mk2": round(power_factor, 8),
        "zt_300k": round(zt_300k, 4),
        "estrutura_predominante": dominant_structure(selected),
        "classe_eletrica": classify_electrical_behavior(band_gap, electrical),
        "indicacao": suggest_application(density, modulus, thermal, electrical, band_gap),
        "componentes": [
            {
                **material.to_dict(),
                "fraction": round(fraction, 4),
                **{
                    key: round(value, 8)
                    for key, value in thermoelectric_values(material).items()
                },
            }
            for material, fraction in selected
        ],
        "xrd": {
            "radiacao": "Cu K-alpha",
            "comprimento_onda_a": 1.5406,
            "observacao": "picos aproximados calculados por lei de Bragg e rede idealizada",
            "picos": estimate_xrd_peaks(selected),
        },
    }


def classify_electrical_behavior(band_gap_ev: float, conductivity: float) -> str:
    if conductivity >= 1.0e6 or band_gap_ev < 0.1:
        return "condutor"
    if conductivity >= 1.0e-6 or band_gap_ev < 3.0:
        return "semicondutor"
    return "isolante"


def suggest_application(
    density: float,
    modulus: float,
    thermal: float,
    electrical: float,
    band_gap: float,
) -> str:
    if electrical > 1.0e7 and thermal > 150:
        return "bom candidato para trilhas condutoras, contatos e dissipacao termica"
    if band_gap >= 3.0 and electrical < 1.0e-6:
        return "bom candidato para isolamento eletrico e barreiras dieletricas"
    if modulus > 140 and density < 5.0:
        return "bom candidato estrutural leve ou reforco de composite"
    if thermal > 100 and electrical < 1.0:
        return "bom candidato para dissipacao termica com isolamento eletrico"
    return "candidato generico; refine com dados experimentais e simulacoes dedicadas"


def print_report(result: Dict[str, Any]) -> None:
    print("\nResultado da simulacao")
    print("-" * 24)
    for key, value in result.items():
        if key == "componentes":
            continue
        label = key.replace("_", " ").capitalize()
        print(f"{label}: {value}")


def main() -> None:
    print("Materiais locais disponiveis:")
    print(", ".join(sorted(LOCAL_MATERIALS)))
    result = simulate_composite({"aluminio": 0.70, "cobre": 0.30})
    print_report(result)


if __name__ == "__main__":
    main()
