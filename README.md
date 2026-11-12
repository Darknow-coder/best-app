<p align="center">
  <img src="public/icons/icon-192.png" width="96" alt="Cobaye" />
</p>

<h1 align="center">Cobaye</h1>

<p align="center"><em>Testez vos habitudes comme un scientifique. Sur un seul sujet : vous.</em></p>

Cobaye transforme une question du quotidien (« le café après 14 h ruine-t-il mon sommeil ? ») en un véritable essai **N de 1 randomisé** : chaque jour, le hasard assigne une condition (A ou B), vous notez vos mesures le soir, les résultats restent **scellés** jusqu'à la fin, puis l'application calcule la différence, son incertitude et rend un **verdict en langage clair**.

- 100 % dans le navigateur, **hors ligne**, installable (PWA).
- **Aucun compte, aucun serveur, aucun traceur** : les données vivent dans IndexedDB, exportables en JSON et CSV.
- Français et anglais, thème clair et sombre, adapté au téléphone comme à l'ordinateur.
- Licence MIT.

## Fonctionnalités

| Écran | Ce qu'il fait |
|---|---|
| **Aujourd'hui** | Révèle la condition du jour (randomisation par blocs), check-in du soir en 20 secondes, rattrapage des jours manqués. |
| **Protocoles** | 14 expériences prêtes à lancer (sommeil, énergie, concentration, humeur, corps), ou création libre. |
| **Assistant** | Question, conditions A/B, 1 à 3 mesures (échelle, nombre, durée, oui/non), protocole, durée, **pré-enregistrement** de la direction attendue et de la plus petite différence qui compte. |
| **Calendrier** | Vue jour par jour, conditions, saisies manquantes, consignes non suivies, clôture anticipée, abandon. |
| **Résultats** | Moyennes, différence, IC 95 % (bootstrap), p-valeur (permutation), d de Cohen, analyse de sensibilité, nuage de points et série temporelle, tableau, carte PNG partageable, export CSV. |
| **Carnet** | Historique des verdicts et conclusions personnelles. |
| **Méthode** | Explication transparente des calculs et de leurs limites. |

## Lancer en local

Prérequis : Node.js 20 ou plus récent.

```bash
npm install
npm run dev
```

Puis ouvrez l'adresse affichée (par défaut `http://localhost:5173`).

Autres commandes :

```bash
npm test          # tests unitaires du domaine (statistiques, randomisation, dates, stockage)
npm run lint      # vérification TypeScript stricte
npm run build     # build de production dans dist/
npm run preview   # sert dist/ en local
```

## Publier gratuitement

### GitHub Pages (recommandé, déjà configuré)

1. Dans les réglages du dépôt, ouvrez **Settings → Pages** et choisissez **Source : GitHub Actions**.
2. Poussez sur la branche `main`. Le workflow `.github/workflows/deploy.yml` lance les tests, construit l'application avec le bon chemin de base (`/<nom-du-dépôt>/`) et la déploie.
3. L'application est servie sur `https://<utilisateur>.github.io/<nom-du-dépôt>/`.

### Netlify, Cloudflare Pages, Vercel

Commande de build : `npm run build`. Dossier à publier : `dist`. Aucune variable d'environnement n'est nécessaire quand le site est servi à la racine d'un domaine.

Pour un sous-chemin, définissez `VITE_BASE=/mon-sous-chemin/` au moment du build.

## Architecture

```
src/
  domain/      types, randomisation, planification, statistiques, verdict, modèles, démo (pur, testé)
  data/        base IndexedDB (Dexie), dépôt, export/import, fichiers (CSV, ICS)
  features/    écrans : today, library, builder, experiments, results, notebook, method, settings, onboarding
  ui/          composants réutilisables (boutons, feuilles, champs, icônes, mascotte)
  i18n/        dictionnaires fr/en et fournisseur
  styles/      tokens de design, base, composants
  app/         routes, mise en page, réglages locaux, hooks
```

Principes :

- **Le domaine ne dépend de rien.** Les statistiques (bootstrap, test de permutation, d de Cohen) et la randomisation sont des fonctions pures, déterministes grâce à une graine, et testées avec Vitest.
- **Local-first.** Le schéma de données est versionné (`schemaVersion`) pour permettre les migrations futures. L'import fusionne intelligemment les exports provenant d'autres appareils.
- **Pas de framework CSS.** Une identité visuelle propre reposant sur des variables CSS, les polices Fraunces, Inter et JetBrains Mono (licence OFL, embarquées pour le hors-ligne), et une palette A/B validée pour les daltonismes.

## Feuille de route

- Synchronisation chiffrée de bout en bout entre appareils (optionnelle).
- Import CSV depuis les montres et applications de suivi.
- Protocoles croisés (plusieurs variables) et analyses bayésiennes.
- Partage d'un protocole par lien, pour reproduire l'expérience d'un ami.

## Avertissement

Cobaye est un outil de curiosité personnelle et d'apprentissage de la méthode expérimentale. Ce n'est ni un dispositif médical ni un avis de santé. Ne modifiez jamais un traitement sur la base d'un verdict de l'application.
