#!/usr/bin/env python3
import json
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter, MaxNLocator


def brl(value, _position=None):
    return f"R$ {value:.6f}".replace(".", ",")


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Uso: generate-cost-chart.py input.json output.png")

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    payload = json.loads(input_path.read_text(encoding="utf-8"))
    rows = payload["rows"]

    labels = [row["label"] for row in rows]
    costs = [row["cost"] for row in rows]
    colors = ["#1f9b6b" if label == "Otimizada" else "#d86d46" for label in labels]

    plt.style.use("seaborn-v0_8-whitegrid")
    fig, ax = plt.subplots(figsize=(10, 6), dpi=150)
    bars = ax.bar(labels, costs, color=colors, edgecolor="#2f3640", linewidth=0.9)

    ax.set_title("Custo final da operacao em Reais", fontsize=16, fontweight="bold", pad=18)
    fig.text(
        0.5,
        0.93,
        f"Gerado em {payload['generatedAt']} a partir das metricas reais capturadas pelo Node.js",
        fontsize=9,
        color="#4d5d72",
        ha="center",
    )
    ax.set_xlabel("Versao da rotina", fontsize=11)
    ax.set_ylabel("Custo final (R$)", fontsize=11)
    ax.yaxis.set_major_formatter(FuncFormatter(brl))
    ax.yaxis.set_major_locator(MaxNLocator(nbins=6))
    ax.grid(axis="y", color="#d7dee8", linewidth=0.9)
    ax.grid(axis="x", visible=False)
    ax.set_axisbelow(True)

    ymax = max(costs) * 1.25 if max(costs) > 0 else 0.000002
    ax.set_ylim(0, ymax)

    for bar, row in zip(bars, rows):
        height = bar.get_height()
        ax.annotate(
            brl(height),
            xy=(bar.get_x() + bar.get_width() / 2, height),
            xytext=(0, 8),
            textcoords="offset points",
            ha="center",
            va="bottom",
            fontsize=10,
            fontweight="bold",
        )

        detail = (
            f"CPU: {row['cpuMs']:.3f} ms\n"
            f"RAM pico: {row['peakMemoryMb']:.3f} MB\n"
            f"Tempo: {row['elapsedMs']:.3f} ms"
        )
        if row["minimumCostApplied"]:
            detail += "\nCusto minimo aplicado"

        ax.annotate(
            detail.replace(".", ","),
            xy=(bar.get_x() + bar.get_width() / 2, 0),
            xytext=(0, -42),
            textcoords="offset points",
            ha="center",
            va="top",
            fontsize=8.5,
            color="#4d5d72",
        )

    legend_handles = [
        plt.Rectangle((0, 0), 1, 1, color="#1f9b6b", label="Otimizada"),
        plt.Rectangle((0, 0), 1, 1, color="#d86d46", label="Nao otimizada"),
    ]
    ax.legend(handles=legend_handles, loc="upper left", frameon=True)

    fig.text(
        0.01,
        0.045,
        "Quando ha pico de CPU ou RAM, o custo cresce porque a formula cobra CPU faturada e RAM faturada.",
        fontsize=8.5,
        color="#4d5d72",
    )
    fig.text(
        0.01,
        0.022,
        "O custo minimo evita que rotinas muito rapidas aparecam como zero.",
        fontsize=8.5,
        color="#4d5d72",
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig.tight_layout(rect=(0, 0.12, 1, 0.91))
    fig.savefig(output_path, format="png", bbox_inches="tight", facecolor="white")
    plt.close(fig)


if __name__ == "__main__":
    main()
