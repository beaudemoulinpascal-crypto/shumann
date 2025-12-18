# DOCUMENTATION TECHNIQUE - NAVIGATION PAR ONGLETS

## 🏗️ Architecture Actuelle (SPA Simplifiée)
Le site fonctionne comme une application monopage (Single Page Application). Tout le code réside dans `index.html`. La navigation par onglets est simulée en affichant/masquant des sections via JavaScript.

## 🔑 Identifiants des Sections (IDs)
La logique repose sur 4 sections principales identifiées par des IDs uniques :

1.  **`#sec-realtime`** (Onglet "Temps Réel")
    *   Contient : Spectrogramme, Dashboard temps réel, Graphique de corrélation.
2.  **`#sec-analysis`** (Onglet "Analyse Globale")
    *   Contient : Widget d'analyse globale, Barres harmoniques, Amplitude, Historique.
3.  **`#sec-guide`** (Onglet "Guide Pédagogique")
    *   Contient : Documentation explicative.
4.  **`#sec-storms`** (Onglet "Activité Orageuse")
    *   Contient : Widget des compteurs d'éclairs et graphique mondial.

## 🛠️ Fichiers Clés

*   **`tabs-navigation.js`** : Script principal.
    *   Initialise les écouteurs d'événements sur les boutons.
    *   Gère la logique `display: block/none` pour les sections.
    *   Déplace dynamiquement la section `#sec-storms` au chargement pour la sortir du flux normal si nécessaire.
    *   Gère le bouton "Retour en haut".

*   **`tabs-navigation.css`** : Styles.
    *   Design des boutons (active/inactive).
    *   Animations de transition (fade in).
    *   Style du menu sticky.

## 🔄 Flux de fonctionnement
1.  Au chargement (`DOMContentLoaded`), le script déplace `#sec-storms` pour qu'il soit un enfant direct de `<main>`.
2.  Il active l'onglet par défaut (`#sec-realtime`).
3.  Au clic sur un bouton :
    *   Masque toutes les sections (`display: none`).
    *   Affiche la section cible (`display: block`).
    *   Joue une petite animation d'opacité.
    *   Scroll en haut de page.

## ✅ Maintenance
Pour ajouter un onglet :
1.  Créer une nouvelle `<section id="sec-nouveau">` dans `index.html`.
2.  Ajouter un bouton dans `<nav class="tabs-nav">` avec `data-tab="sec-nouveau"`.
3.  Ajouter l'ID à la liste `sections` dans `tabs-navigation.js`.
