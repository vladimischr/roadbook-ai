import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout, LegalH2 } from "@/components/LegalLayout";

export const Route = createFileRoute("/cgu")({
  component: CGU,
  head: () => ({
    meta: [
      { title: "Conditions générales d'utilisation — Roadbook.ai" },
      {
        name: "description",
        content: "Conditions générales d'utilisation et de vente de Roadbook.ai.",
      },
    ],
  }),
});

function CGU() {
  return (
    <LegalLayout
      eyebrow="Légal"
      title="Conditions générales d'utilisation et de vente"
      lastUpdated="1er mai 2026"
    >
      <p>
        Les présentes conditions générales (« <strong>CGU</strong> »)
        régissent l'utilisation du service Roadbook.ai, édité par{" "}
        <strong>Vladimir Mischler</strong> exerçant en Entreprise
        Individuelle sous le nom commercial <strong>BRAKIAL</strong>{" "}
        (SIRET 953 464 807 00015), par tout utilisateur («{" "}
        <strong>Client</strong> »). En créant un compte ou en
        souscrivant à un plan, le Client accepte sans réserve les
        présentes CGU.
      </p>

      <LegalH2>1. Objet du service</LegalH2>
      <p>
        Roadbook.ai est un outil en ligne (SaaS) qui permet aux travel
        designers, agences de voyage et professionnels du tourisme de
        composer, mettre en forme et exporter des roadbooks éditoriaux
        à destination de leurs clients voyageurs. Le service propose
        trois modes de composition&nbsp;:
      </p>
      <ul className="list-disc space-y-1 pl-6">
        <li>Génération automatique par intelligence artificielle</li>
        <li>Saisie manuelle des étapes</li>
        <li>Import d'un fichier Excel existant</li>
      </ul>

      <LegalH2>2. Inscription et compte</LegalH2>
      <p>
        L'accès au service nécessite la création d'un compte via une
        adresse email valide. L'authentification se fait par lien
        magique (sans mot de passe). Le Client est seul responsable de
        la confidentialité de son adresse email et de l'utilisation
        qui est faite de son compte.
      </p>

      <LegalH2>3. Plans et tarifs</LegalH2>
      <p>
        Roadbook.ai propose plusieurs formules d'abonnement&nbsp;:
        Découverte (gratuit), Solo, Studio et Atelier. Les tarifs
        détaillés sont indiqués sur la page{" "}
        <a
          href="/pricing"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          /pricing
        </a>{" "}
        et peuvent évoluer&nbsp;; les tarifs en vigueur au moment de
        la souscription sont garantis pour la durée de l'engagement
        en cours.
      </p>
      <p>
        <strong>Période d'essai</strong>&nbsp;: les plans payants
        bénéficient d'une période d'essai gratuite de 14 jours.
        Pendant cette période, le Client peut résilier sans frais via
        le portail de facturation Stripe.
      </p>

      <LegalH2>4. Modalités de paiement</LegalH2>
      <p>
        Les paiements sont traités par <strong>Stripe Payments
        Europe Ltd.</strong> Le Client autorise le prélèvement
        automatique mensuel ou annuel selon la périodicité choisie.
        Les prix sont affichés hors taxes (HT)&nbsp;; la TVA
        applicable est ajoutée automatiquement par Stripe en fonction
        du pays de facturation du Client.
      </p>

      <LegalH2>5. Quotas et utilisation</LegalH2>
      <p>
        Chaque plan inclut un nombre maximal de roadbooks pouvant
        être composés par mois (sauf Atelier, illimité). Le quota
        s'applique aux trois modes de composition (IA, manuel,
        import). Les modifications, recalculs et exports PDF
        n'entament pas le quota. Le compteur se réinitialise à
        chaque nouvelle période de facturation.
      </p>

      <LegalH2>6. Résiliation et remboursement</LegalH2>
      <p>
        Le Client peut résilier son abonnement à tout moment via le
        portail de facturation. La résiliation prend effet à la fin
        de la période en cours&nbsp;; aucun remboursement
        prorata-temporis n'est effectué.
      </p>
      <p>
        Conformément à l'article L221-28 du Code de la consommation,
        le Client professionnel renonce expressément à son droit de
        rétractation dès que le service est entièrement exécuté
        (premier roadbook composé).
      </p>

      <LegalH2>7. Propriété intellectuelle</LegalH2>
      <p>
        <strong>Le Client conserve la propriété intégrale du contenu
        de ses roadbooks</strong> (étapes, narratives, contacts,
        photos importées). Roadbook.ai ne revendique aucun droit sur
        les contenus créés par le Client.
      </p>
      <p>
        Inversement, la plateforme Roadbook.ai (code, design,
        templates, prompts IA) reste la propriété exclusive de
        l'éditeur. Le Client ne peut pas copier, redistribuer ou
        revendre le service.
      </p>

      <LegalH2>8. Responsabilité</LegalH2>
      <p>
        Le contenu généré par l'intelligence artificielle est fourni
        à titre indicatif. <strong>Roadbook.ai ne garantit pas
        l'exactitude des informations générées</strong> (lodges,
        contacts, distances, conseils). Il appartient au Client, en
        sa qualité de professionnel du voyage, de vérifier ces
        informations avant transmission à ses propres clients.
        Roadbook.ai ne saurait être tenu responsable de tout
        préjudice résultant d'une erreur ou imprécision dans les
        contenus générés.
      </p>
      <p>
        La responsabilité de Roadbook.ai est limitée au montant
        effectivement payé par le Client au cours des 12 derniers
        mois.
      </p>

      <LegalH2>9. Disponibilité du service</LegalH2>
      <p>
        Roadbook.ai s'engage à mettre en œuvre les moyens techniques
        nécessaires pour assurer la disponibilité du service, sans
        toutefois garantir une disponibilité de 100%. Des
        interruptions peuvent survenir pour maintenance, mises à
        jour, ou incidents techniques chez les sous-traitants
        (Supabase, Cloudflare, Stripe, Anthropic, Google).
      </p>

      <LegalH2>10. Données personnelles</LegalH2>
      <p>
        Le traitement des données personnelles est régi par notre{" "}
        <a
          href="/confidentialite"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          politique de confidentialité
        </a>
        .
      </p>

      <LegalH2>11. Modification des CGU</LegalH2>
      <p>
        Roadbook.ai se réserve le droit de modifier les présentes
        CGU. Toute modification substantielle sera notifiée au Client
        par email au moins 30 jours avant son entrée en vigueur. Le
        Client conserve la faculté de résilier sans frais en cas de
        désaccord.
      </p>

      <LegalH2>12. Droit applicable et juridiction</LegalH2>
      <p>
        Les présentes CGU sont régies par le droit français. Tout
        litige relatif à leur interprétation ou à leur exécution
        relève de la compétence exclusive des tribunaux français,
        sauf disposition impérative contraire. Le Client peut
        recourir à un médiateur de la consommation préalablement à
        toute action judiciaire.
      </p>
    </LegalLayout>
  );
}
