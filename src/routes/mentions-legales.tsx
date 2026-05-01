import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout, LegalH2 } from "@/components/LegalLayout";

export const Route = createFileRoute("/mentions-legales")({
  component: MentionsLegales,
  head: () => ({
    meta: [
      { title: "Mentions légales — Roadbook.ai" },
      {
        name: "description",
        content: "Mentions légales du site Roadbook.ai.",
      },
    ],
  }),
});

function MentionsLegales() {
  return (
    <LegalLayout
      eyebrow="Légal"
      title="Mentions légales"
      lastUpdated="1er mai 2026"
    >
      <p>
        Conformément aux dispositions des articles 6-III et 19 de la loi
        n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie
        numérique, dite L.C.E.N., nous portons à la connaissance des
        utilisateurs du site les présentes mentions légales.
      </p>

      <LegalH2>Éditeur du site</LegalH2>
      <p>
        <strong>Roadbook.ai</strong>
        <br />
        Site édité par <strong>Vladimir Mischler</strong>, exerçant sous
        le nom commercial <strong>BRAKIAL</strong>.
        <br />
        Forme juridique&nbsp;: Entreprise Individuelle
        <br />
        Siège social&nbsp;: 3 Chemin de Fond Ratel, 38640 Claix, France
        <br />
        Numéro SIRET&nbsp;: 953 464 807 00015
        <br />
        Numéro de TVA intracommunautaire&nbsp;: FR39 953 464 807
        <br />
        Directeur de la publication&nbsp;: Vladimir Mischler
        <br />
        Email&nbsp;: contact@roadbook.ai
      </p>

      <LegalH2>Hébergement</LegalH2>
      <p>
        Le site est hébergé par <strong>Cloudflare, Inc.</strong>
        <br />
        101 Townsend Street, San Francisco, CA 94107, États-Unis
        <br />
        Site web&nbsp;: cloudflare.com
      </p>
      <p>
        La base de données et l'authentification sont opérées par{" "}
        <strong>Supabase, Inc.</strong> (États-Unis). Les paiements sont
        traités par <strong>Stripe Payments Europe Ltd.</strong>
        (Irlande).
      </p>

      <LegalH2>Propriété intellectuelle</LegalH2>
      <p>
        L'ensemble des contenus présents sur le site Roadbook.ai
        (textes, graphismes, logos, icônes, images, vidéos, code source)
        sont la propriété exclusive de l'éditeur, à l'exception des
        marques, logos ou contenus appartenant à d'autres sociétés
        partenaires ou auteurs.
      </p>
      <p>
        Toute reproduction, distribution, modification, adaptation,
        retransmission ou publication, même partielle, de ces différents
        éléments est strictement interdite sans l'accord exprès par
        écrit de Roadbook.ai.
      </p>

      <LegalH2>Données personnelles</LegalH2>
      <p>
        Le traitement des données personnelles est détaillé dans notre{" "}
        <a
          href="/confidentialite"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          politique de confidentialité
        </a>
        .
      </p>

      <LegalH2>Cookies</LegalH2>
      <p>
        Le site utilise des cookies strictement nécessaires à son
        fonctionnement (session d'authentification). Aucun cookie de
        traçage publicitaire n'est déposé.
      </p>

      <LegalH2>Médiation de la consommation</LegalH2>
      <p>
        Conformément aux dispositions du Code de la consommation, en cas
        de litige, le client peut recourir gratuitement à un médiateur
        de la consommation. La plateforme européenne de règlement en
        ligne des litiges est accessible à l'adresse&nbsp;:{" "}
        <a
          href="https://ec.europa.eu/consumers/odr"
          target="_blank"
          rel="noreferrer"
          className="text-primary underline-offset-4 hover:underline"
        >
          ec.europa.eu/consumers/odr
        </a>
        .
      </p>

      <LegalH2>Droit applicable</LegalH2>
      <p>
        Les présentes mentions légales sont régies par le droit
        français. Tout litige relatif à leur interprétation ou à leur
        exécution relève de la compétence des tribunaux français.
      </p>
    </LegalLayout>
  );
}
