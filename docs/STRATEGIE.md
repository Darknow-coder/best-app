# Cobaye — réflexion, stratégie et conception

Ce document conserve les phases A, B et C du projet, telles qu'elles ont été menées avant la première ligne de code.

## Phase A — Réflexion

Une vingtaine de pistes ont été explorées, puis six concepts radicalement différents ont été notés de 1 à 5 sur sept critères.

| Concept | Originalité | Utilité | Fidélisation | Concurrence | Faisabilité 0 € | Évolution | Rentabilité | Total |
|---|---|---|---|---|---|---|---|---|
| **Laboratoire d'expériences sur soi** (essais A/B randomisés) | 5 | 4 | 4 | 5 | 4 | 5 | 4 | **31** |
| Journal phénologique personnel | 5 | 3 | 3 | 4 | 5 | 3 | 2 | 25 |
| Dossier « En cas de » (coffre local chiffré pour ses proches) | 3 | 5 | 1 | 3 | 4 | 3 | 3 | 22 |
| Répartition de la charge mentale du foyer | 3 | 4 | 3 | 3 | 2 | 4 | 3 | 22 |
| Journal de prévisions et calibration | 3 | 3 | 3 | 2 | 5 | 3 | 2 | 21 |
| Jeu de déduction quotidien coopératif | 2 | 2 | 4 | 1 | 4 | 2 | 2 | 17 |

Pistes écartées plus tôt : générateur de boucles de marche (API de routage payante en production), planificateur de potager (concurrence dense), carnet de dégustation universel (peu différenciant), cartes communautaires (modération et backend impossibles à 0 €).

Vérification de la concurrence : les outils d'auto-expérimentation existants sont des prototypes académiques (StudyMe, StudyU), un projet Google abandonné (PACO) ou de petites applications natives peu connues (Self-E). Les applications de suivi (Bearable, Exist.io) proposent des corrélations passives, payantes, sans randomisation ni design expérimental. Aucun produit web gratuit, soigné, hors ligne et respectueux des données n'occupe le créneau.

## Phase B — Stratégie

**Produit.** Cobaye : « Testez vos habitudes comme un scientifique. Sur un seul sujet : vous. »

**Problème.** Les applications de suivi accumulent des données mais ne répondent jamais à la question « est-ce que X me fait du bien ? », faute de groupe témoin, de randomisation et de test statistique.

**Solution.** Transformer une question en essai N de 1 : hypothèse, conditions A/B, randomisation quotidienne par blocs, check-in du soir, résultats scellés, verdict en langage clair avec intervalle de confiance et taille d'effet, carte partageable.

**Public.** 25-45 ans curieux, lecteurs de vulgarisation, amateurs de productivité et de bien-être, sceptiques du marketing du self-care. Secondaire : enseignants, coachs, praticiens des essais N de 1.

**Rétention.** Chaque expérience a un début, une fin et une récompense (le verdict), sur 2 à 4 semaines, puis la question suivante. Les cartes de résultat sont un vecteur d'acquisition organique.

**Modèle économique.** Cœur gratuit pour toujours. « Pro » optionnel : synchronisation chiffrée, analyses avancées, import de montres connectées, rapports PDF. Licence B2B pour coachs et chercheurs.

**Éthique.** Aucune donnée ne quitte l'appareil. Avertissement explicite : pas un dispositif médical.

## Phase C — Conception

**Identité.** Nom « Cobaye », mascotte cochon d'Inde géométrique en SVG. Ambiance « carnet de laboratoire moderne » : papier chaud, encre profonde, terracotta pour A et sarcelle pour B (palette validée pour les déficiences de la vision des couleurs). Typographie Fraunces (titres), Inter (interface), JetBrains Mono (chiffres), licences OFL embarquées.

**Fonctionnalités.** Aujourd'hui, Protocoles, Assistant en cinq étapes avec pré-enregistrement, Calendrier, Résultats scellés puis révélés, Carnet, Méthode, Réglages (langue, thème, export/import, rappels .ics, installation).

**Architecture.** Vite + React 18 + TypeScript strict, CSS natif à variables, Dexie (IndexedDB), React Router, vite-plugin-pwa, Vitest. Domaine pur et testé ; données locales versionnées ; hébergement statique gratuit (GitHub Pages, workflow fourni).
