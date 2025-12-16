#!/usr/bin/env python3
"""
📊 Calculateur RSI (Relative Strength Index)

Ce module fournit une implémentation complète du calcul du RSI
pour l'analyse technique des marchés financiers.

Auteur: Sniper Financial Bot
Date: 2025-12-14
"""

import pandas as pd
import numpy as np
from typing import List, Union


def calculate_rsi(
    prices: Union[List[float], pd.Series, np.ndarray],
    period: int = 14,
    price_type: str = 'close'
) -> Union[float, List[float], pd.Series]:
    """
    Calcule le RSI (Relative Strength Index) pour une série de prix.

    Le RSI est un oscillateur de momentum qui mesure la vitesse et
    l'amplitude des mouvements de prix. Il oscille entre 0 et 100.

    Args:
        prices: Série de prix (liste, pandas Series, ou numpy array)
        period: Période pour le calcul (défaut: 14)
        price_type: Type de prix ('close', 'high', 'low', 'hl2', 'hlc3', 'ohlc4')

    Returns:
        RSI valeur(s) (float pour une valeur, Series pour une série)

    Exemple:
        >>> prices = [100, 102, 101, 105, 107, 106, 108, 110, 109, 111]
        >>> rsi = calculate_rsi(prices, period=14)
        >>> print(f"RSI: {rsi:.2f}")
    """
    # Convertir en pandas Series si nécessaire
    if isinstance(prices, list):
        prices = pd.Series(prices)
    elif isinstance(prices, np.ndarray):
        prices = pd.Series(prices)

    # Calculer les variations de prix
    delta = prices.diff()

    # Séparer les gains et les pertes
    gains = delta.where(delta > 0, 0)
    losses = -delta.where(delta < 0, 0)

    # Calculer la moyenne mobile exponentielle (EMA) des gains et pertes
    # Première valeur : moyenne simple
    avg_gains = gains.rolling(window=period, min_periods=period).mean()
    avg_losses = losses.rolling(window=period, min_periods=period).mean()

    # EMA pour les valeurs suivantes
    for i in range(period, len(avg_gains)):
        avg_gains.iloc[i] = (avg_gains.iloc[i-1] * (period - 1) + gains.iloc[i]) / period
        avg_losses.iloc[i] = (avg_losses.iloc[i-1] * (period - 1) + losses.iloc[i]) / period

    # Calculer le RS (Relative Strength)
    rs = avg_gains / avg_losses

    # Calculer le RSI
    rsi = 100 - (100 / (1 + rs))

    return rsi


def calculate_rsi_simple(prices: List[float], period: int = 14) -> float:
    """
    Calcule le RSI pour une liste de prix (version simple).

    Args:
        prices: Liste des prix de clôture
        period: Période pour le calcul

    Returns:
        Valeur RSI actuelle (float)

    Exemple:
        >>> prices = [100, 102, 101, 105, 107, 106, 108, 110, 109, 111, 113, 112, 115, 114]
        >>> rsi = calculate_rsi_simple(prices)
        >>> print(f"RSI: {rsi:.2f}")
    """
    if len(prices) < period + 1:
        raise ValueError(f"Pas assez de données. Besoin d'au moins {period + 1} prix.")

    # Calculer les variations
    deltas = [prices[i] - prices[i-1] for i in range(1, len(prices))]

    # Séparer gains et pertes
    gains = [d if d > 0 else 0 for d in deltas]
    losses = [-d if d < 0 else 0 for d in deltas]

    # Première moyenne (simple)
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period

    # Moyennes mobiles exponentielles pour les valeurs suivantes
    for i in range(period, len(gains)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period

    # Éviter la division par zéro
    if avg_loss == 0:
        return 100.0

    # Calculer le RS et RSI
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))

    return rsi


def get_rsi_signal(rsi_value: float) -> dict:
    """
    Interprète le signal RSI.

    Args:
        rsi_value: Valeur RSI

    Returns:
        Dictionnaire avec signal, force et recommandation

    Exemple:
        >>> signal = get_rsi_signal(75)
        >>> print(signal)
        {'signal': 'SURACHAT', 'force': 'Fort', 'action': 'Vendre', 'couleur': 'Rouge'}
    """
    if rsi_value >= 70:
        return {
            'signal': 'SURACHAT',
            'force': 'Fort' if rsi_value >= 80 else 'Modéré',
            'action': 'Vendre',
            'couleur': 'Rouge',
            'niveau': rsi_value,
            'interpretation': 'Le marché est en surachat. Une correction pourrait intervenir.'
        }
    elif rsi_value <= 30:
        return {
            'signal': 'SURVENTE',
            'force': 'Fort' if rsi_value <= 20 else 'Modéré',
            'action': 'Acheter',
            'couleur': 'Vert',
            'niveau': rsi_value,
            'interpretation': 'Le marché est en survente. Une reprise pourrait intervenir.'
        }
    else:
        zone = 'Neutre'
        if rsi_value > 50:
            zone = 'Tendance haussière'
            action = 'Conserver/Acheter'
            couleur = 'Vert clair'
        elif rsi_value < 50:
            zone = 'Tendance baissière'
            action = 'Conserver/Vendre'
            couleur = 'Rouge clair'

        return {
            'signal': zone,
            'force': 'Faible',
            'action': action,
            'couleur': couleur,
            'niveau': rsi_value,
            'interpretation': 'Le marché est dans une zone neutre.'
        }


def analyze_rsi_divergence(
    prices: List[float],
    rsi_values: List[float],
    lookback: int = 10
) -> dict:
    """
    Détecte les divergences entre le prix et le RSI.

    Args:
        prices: Liste des prix
        rsi_values: Liste des valeurs RSI
        lookback: Nombre de périodes à analyser

    Returns:
        Dictionnaire avec information sur la divergence

    Exemple:
        >>> divergence = analyze_rsi_divergence(prices, rsi_values)
        >>> print(divergence)
    """
    if len(prices) < lookback or len(rsi_values) < lookback:
        return {
            'divergence': False,
            'type': None,
            'force': 'N/A',
            'interpretation': 'Pas assez de données pour analyser la divergence.'
        }

    # Analyser les tendances récentes
    price_trend = np.polyfit(range(lookback), prices[-lookback:], 1)[0]
    rsi_trend = np.polyfit(range(lookback), rsi_values[-lookback:], 1)[0]

    # Détecter divergence haussière (prix baisse, RSI monte)
    if price_trend < 0 and rsi_trend > 0:
        return {
            'divergence': True,
            'type': 'Haussière',
            'force': 'Fort' if abs(rsi_trend) > abs(price_trend) else 'Modéré',
            'interpretation': 'Divergence haussière détectée : le prix baisse mais le momentum s\'améliore.',
            'signal': 'ACHAT potentiel'
        }
    # Détecter divergence baissière (prix monte, RSI baisse)
    elif price_trend > 0 and rsi_trend < 0:
        return {
            'divergence': True,
            'type': 'Baissière',
            'force': 'Fort' if abs(rsi_trend) > abs(price_trend) else 'Modéré',
            'interpretation': 'Divergence baissière détectée : le prix monte mais le momentum se dégrade.',
            'signal': 'VENTE potentiel'
        }
    else:
        return {
            'divergence': False,
            'type': 'Aucune',
            'force': 'N/A',
            'interpretation': 'Pas de divergence détectée.',
            'signal': 'Neutre'
        }


def calculate_multiple_timeframes(
    df: pd.DataFrame,
    timeframes: List[int] = [7, 14, 21]
) -> pd.DataFrame:
    """
    Calcule le RSI sur plusieurs timeframes.

    Args:
        df: DataFrame avec colonne 'close'
        timeframes: Liste des périodes RSI à calculer

    Returns:
        DataFrame avec colonnes RSI_x pour chaque timeframe

    Exemple:
        >>> df = pd.DataFrame({'close': [100, 102, 101, ...]})
        >>> df = calculate_multiple_timeframes(df, [7, 14, 21])
        >>> print(df[['RSI_7', 'RSI_14', 'RSI_21']])
    """
    result_df = df.copy()

    for period in timeframes:
        rsi = calculate_rsi(df['close'], period=period)
        result_df[f'RSI_{period}'] = rsi

    return result_df


def plot_rsi_chart(prices: List[float], rsi_values: List[float], title: str = "RSI Chart"):
    """
    Génère un graphique du RSI (nécessite matplotlib).

    Args:
        prices: Liste des prix
        rsi_values: Liste des valeurs RSI
        title: Titre du graphique

    Exemple:
        >>> plot_rsi_chart(prices, rsi_values)
    """
    try:
        import matplotlib.pyplot as plt

        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 8), sharex=True)

        # Graphique des prix
        ax1.plot(prices, label='Prix', color='blue')
        ax1.set_title(title)
        ax1.set_ylabel('Prix')
        ax1.legend()
        ax1.grid(True)

        # Graphique RSI
        ax2.plot(rsi_values, label='RSI', color='purple')
        ax2.axhline(y=70, color='r', linestyle='--', label='Surachat (70)')
        ax2.axhline(y=30, color='g', linestyle='--', label='Survente (30)')
        ax2.axhline(y=50, color='gray', linestyle='-', alpha=0.5)
        ax2.set_ylabel('RSI')
        ax2.set_xlabel('Temps')
        ax2.set_ylim(0, 100)
        ax2.legend()
        ax2.grid(True)

        plt.tight_layout()
        plt.show()

    except ImportError:
        print("⚠️ Matplotlib n'est pas installé. Installez-le avec: pip install matplotlib")


# ===== EXEMPLES D'UTILISATION =====

def exemple_utilisation_basic():
    """Exemple d'utilisation basique du calcul RSI."""
    print("=" * 60)
    print("📊 EXEMPLE 1: Calcul RSI Basique")
    print("=" * 60)

    # Prix fictifs sur 20 périodes
    prix = [
        100, 101, 102, 103, 104, 103, 102, 101, 100, 99,
        98, 99, 100, 101, 102, 103, 104, 105, 106, 105
    ]

    # Calculer RSI
    rsi = calculate_rsi_simple(prix, period=14)
    print(f"\nPrix: {prix}")
    print(f"RSI (14 périodes): {rsi:.2f}")

    # Interpréter le signal
    signal = get_rsi_signal(rsi)
    print(f"\n🎯 Signal: {signal['signal']}")
    print(f"   Force: {signal['force']}")
    print(f"   Action recommandée: {signal['action']}")
    print(f"   Couleur: {signal['couleur']}")
    print(f"   Interprétation: {signal['interpretation']}")


def exemple_utilisation_avance():
    """Exemple d'utilisation avancée avec pandas."""
    print("\n" + "=" * 60)
    print("📊 EXEMPLE 2: Calcul RSI Avancé avec Pandas")
    print("=" * 60)

    # Créer des données fictives
    np.random.seed(42)
    dates = pd.date_range(start='2024-01-01', periods=100, freq='D')
    prix_base = 100

    # Générer des prix avec tendance et bruit
    returns = np.random.normal(0.001, 0.02, 100)
    prices = [prix_base]
    for ret in returns:
        prices.append(prices[-1] * (1 + ret))

    df = pd.DataFrame({
        'date': dates,
        'close': prices[1:]
    })

    # Calculer RSI sur plusieurs timeframes
    df = calculate_multiple_timeframes(df, timeframes=[7, 14, 21])

    # Afficher les dernières valeurs
    print(f"\nDernières 5 valeurs:")
    print(df[['date', 'close', 'RSI_7', 'RSI_14', 'RSI_21']].tail().to_string(index=False))

    # Analyser le signal actuel
    rsi_actuel = df['RSI_14'].iloc[-1]
    signal = get_rsi_signal(rsi_actuel)
    print(f"\n🎯 RSI Actuel (14): {rsi_actuel:.2f}")
    print(f"   Signal: {signal['signal']}")
    print(f"   Action: {signal['action']}")


def exemple_divergence():
    """Exemple de détection de divergence."""
    print("\n" + "=" * 60)
    print("📊 EXEMPLE 3: Détection de Divergence RSI")
    print("=" * 60)

    # Prix avec divergence haussière (prix baisse, RSI monte)
    prix_divergence = [
        105, 104, 103, 102, 101, 100, 99, 98, 97, 96,
        95, 96, 97, 98, 99, 100, 101, 102, 103, 104
    ]

    rsi_divergence = calculate_rsi(prix_divergence, period=14)
    rsi_list = rsi_divergence.tolist()

    print(f"\nPrix: {prix_divergence}")
    print(f"RSI: {[f'{r:.2f}' for r in rsi_list]}")

    divergence = analyze_rsi_divergence(prix_divergence, rsi_list)
    print(f"\n🔍 Analyse de divergence:")
    print(f"   Divergence: {divergence['divergence']}")
    print(f"   Type: {divergence['type']}")
    print(f"   Force: {divergence['force']}")
    print(f"   Signal: {divergence['signal']}")
    print(f"   Interprétation: {divergence['interpretation']}")


def exemple_trading_signal():
    """Exemple de signal de trading basé sur RSI."""
    print("\n" + "=" * 60)
    print("📊 EXEMPLE 4: Signal de Trading RSI")
    print("=" * 60)

    # Prix actuels avec niveaux de support/résistance
    prix_actuel = 4892.50
    support = 4875.00
    resistance = 4910.00

    # Calculer RSI basé sur données historiques
    prix_historique = [4870, 4875, 4880, 4885, 4890, 4888, 4892, 4895, 4898, 4895,
                       4892, 4890, 4888, 4892, 4894, 4896, 4898, 4900, 4902, 4892]

    rsi = calculate_rsi_simple(prix_historique, period=14)
    signal = get_rsi_signal(rsi)

    print(f"\n💹 Prix Actuel ES: {prix_actuel}")
    print(f"   Support: {support}")
    print(f"   Résistance: {resistance}")
    print(f"\n📊 RSI (14): {rsi:.2f}")
    print(f"   Signal: {signal['signal']}")
    print(f"   Force: {signal['force']}")

    # Recommandation de trading
    print(f"\n🎯 Recommandation de Trading:")
    print(f"   Action: {signal['action']}")

    if rsi < 30 and prix_actuel <= support * 1.002:  # Près du support
        print(f"   ✅ EXCELLENT POINT D'ENTRÉE")
        print(f"   - RSI en survente")
        print(f"   - Prix proche du support")
        print(f"   - Potentiel de rebond")
    elif rsi > 70 and prix_actuel >= resistance * 0.998:  # Près de la résistance
        print(f"   ⚠️ PRUDENCE RECOMMANDÉE")
        print(f"   - RSI en surachat")
        print(f"   - Prix proche de la résistance")
        print(f"   - Risque de rejection")
    else:
        print(f"   ℹ️ Zone neutre - Attendre confirmation")

    print(f"\n💡 Conseil: Combinaison avec autres indicateurs recommandée")


# ===== PROGRAMME PRINCIPAL =====

if __name__ == "__main__":
    print("\n" + "🚀" * 30)
    print("📊 CALCULATEUR RSI - Sniper Financial Bot")
    print("🚀" * 30)

    # Exécuter tous les exemples
    exemple_utilisation_basic()
    exemple_utilisation_avance()
    exemple_divergence()
    exemple_trading_signal()

    print("\n" + "=" * 60)
    print("✅ Tous les exemples exécutés avec succès!")
    print("=" * 60)

    # Aide sur l'utilisation
    print("\n📖 Utilisation:")
    print("   from rsi_calculator import calculate_rsi, get_rsi_signal")
    print("   rsi = calculate_rsi(prices, period=14)")
    print("   signal = get_rsi_signal(rsi)")

    print("\n" + "🚀" * 30)
