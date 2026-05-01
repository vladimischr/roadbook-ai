import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout, LegalH2, LegalH3 } from "@/components/LegalLayout";

export const Route = createFileRoute("/confidentialite")({
  component: Confidentialite,
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — Roadbook.ai" },
      {
        name: "description",
        content:
          "Comment Roadbook.ai collecte, stocke et utilise vos données personnelles.",
      },
    ],
  }),
});

function Confidentialite() {
  return (
    <LegalLayout
      eyebrow="Légal"
      title="Politique de confidentialité"
      lastUpdated="1er mai 2026"
    >
      <p>
        La présente politique de confidentialité a pour objet d'informer
        les utilisateurs de Roadbook.ai des modalités de collecte,
        traitement et utilisation de leurs données personnelles, dans le
        respect du Règlement Général sur la Protection des Données
        (RGPD) et de la loi Informatique et Libertés.
      </p>

      <LegalH2>1. Responsable du traitement</LegalH2>
      <p>
        Le responsable du traitement des données est{" "}
        <strong>Vladimir Mischler</strong>, exerçant en Entreprise
        Individuelle sous le nom commercial <strong>BRAKIAL</strong> —
        éditeur de Roadbook.ai. Adresse&nbsp;: 3 Chemin de Fond Ratel,
        38640 Claix, France. SIRET&nbsp;: 953 464 807 00015.
      </p>
      <p>
        Pour toute question relative à vos données, contactez{" "}
        <a
          href="mailto:contact@roadbook.ai"
          className="text-primary underline-offset-4 hover:underline"
        >
          contact@roadbook.ai
        </a>
        .
      </p>

      <LegalH2>2. Données collectées</LegalH2>
      <LegalH3>2.1 Données fournies par l'utilisateur</LegalH3>
      <ul className="list-disc space-y-1 pl-6">
        <li>Adresse email (pour l'authentification par lien magique)</li>
        <li>
          Données de facturation (nom, adresse, pays) — collectées par
          Stripe lors de la souscription à un plan payant
        </li>
        <li>
          Contenu des roadbooks créés (noms de clients, destinations,
          dates, étapes, hébergements, notes)
        </li>
      </ul>

      <LegalH3>2.2 Données collectées automatiquement</LegalH3>
      <ul className="list-disc space-y-1 pl-6">
        <li>
          Adresse IP, pour des raisons de sécurité et de prévention
          d'abus
        </li>
        <li>
          Logs d'utilisation des services IA, conservés 30 jours
        </li>
      </ul>

      <LegalH2>3. Finalités du traitement</LegalH2>
      <p>Vos données sont traitées pour&nbsp;:</p>
      <ul className="list-disc space-y-1 pl-6">
        <li>Vous authentifier et vous permettre d'accéder au service</li>
        <li>Exécuter le contrat de souscription (génération de
          roadbooks, facturation, support)</li>
        <li>Gérer la relation client (réponses aux questions, support
          technique)</li>
        <li>Respecter nos obligations légales (comptabilité, fiscalité)</li>
        <li>Améliorer le service (analyse anonymisée des erreurs et
          performances)</li>
      </ul>

      <LegalH2>4. Bases légales</LegalH2>
      <p>
        Conformément à l'article 6 du RGPD, le traitement de vos
        données repose sur&nbsp;:
      </p>
      <ul className="list-disc space-y-1 pl-6">
        <li>
          <strong>L'exécution du contrat</strong> que vous concluez avec
          Roadbook.ai en souscrivant au service
        </li>
        <li>
          <strong>Notre intérêt légitime</strong> à sécuriser le service
          et prévenir les abus
        </li>
        <li>
          <strong>Le respect d'obligations légales</strong>
          (comptabilité, fiscalité)
        </li>
      </ul>

      <LegalH2>5. Sous-traitants et destinataires</LegalH2>
      <p>
        Vos données sont partagées avec les sous-traitants suivants,
        strictement nécessaires à l'exécution du service&nbsp;:
      </p>
      <ul className="list-disc space-y-1 pl-6">
        <li>
          <strong>Supabase</strong> (États-Unis) — hébergement de la
          base de données et de l'authentification
        </li>
        <li>
          <strong>Cloudflare</strong> (États-Unis) — hébergement du site
          et des fonctions serverless
        </li>
        <li>
          <strong>Stripe</strong> (Irlande / États-Unis) — traitement
          des paiements
        </li>
        <li>
          <strong>Anthropic</strong> (États-Unis) — fournisseur du modèle
          Claude utilisé pour la génération IA. Le contenu de vos
          briefs leur est transmis pour traitement et n'est pas conservé
          au-delà de la requête.
        </li>
        <li>
          <strong>Google Maps Platform</strong> (États-Unis) — géocodage
          et tracé d'itinéraires
        </li>
        <li>
          <strong>Pexels</strong> (Allemagne) — photographies de
          couverture
        </li>
      </ul>
      <p>
        Les transferts vers les États-Unis se font dans le cadre du
        Data Privacy Framework EU-US ou de Clauses Contractuelles
        Types.
      </p>

      <LegalH2>6. Durée de conservation</LegalH2>
      <ul className="list-disc space-y-1 pl-6">
        <li>
          Données de compte&nbsp;: jusqu'à la suppression du compte par
          l'utilisateur
        </li>
        <li>
          Roadbooks créés&nbsp;: jusqu'à leur suppression par
          l'utilisateur
        </li>
        <li>
          Factures et données comptables&nbsp;: 10 ans (obligation
          légale)
        </li>
        <li>Logs techniques&nbsp;: 30 jours</li>
      </ul>

      <LegalH2>7. Vos droits</LegalH2>
      <p>Conformément au RGPD, vous disposez des droits suivants&nbsp;:</p>
      <ul className="list-disc space-y-1 pl-6">
        <li>
          <strong>Droit d'accès</strong>&nbsp;: obtenir une copie de
          vos données
        </li>
        <li>
          <strong>Droit de rectification</strong>&nbsp;: corriger des
          données inexactes
        </li>
        <li>
          <strong>Droit à l'effacement</strong>&nbsp;: supprimer vos
          données et votre compte
        </li>
        <li>
          <strong>Droit à la portabilité</strong>&nbsp;: récupérer vos
          données dans un format structuré
        </li>
        <li>
          <strong>Droit d'opposition</strong> et de limitation du
          traitement
        </li>
        <li>
          <strong>Droit d'introduire une réclamation</strong> auprès
          de la CNIL (cnil.fr)
        </li>
      </ul>
      <p>
        Pour exercer ces droits, contactez{" "}
        <a
          href="mailto:contact@roadbook.ai"
          className="text-primary underline-offset-4 hover:underline"
        >
          contact@roadbook.ai
        </a>
        . Une réponse vous sera apportée sous un délai d'un mois
        maximum.
      </p>

      <LegalH2>8. Sécurité</LegalH2>
      <p>
        Roadbook.ai met en œuvre des mesures techniques et
        organisationnelles appropriées pour protéger vos données
        contre la perte, le détournement, l'accès non autorisé, la
        divulgation, la modification ou la destruction. Toutes les
        communications sont chiffrées (HTTPS), les mots de passe ne
        sont pas stockés (authentification par lien magique
        uniquement), et l'accès aux bases de données est restreint
        par règles de sécurité au niveau ligne (RLS).
      </p>

      <LegalH2>9. Modifications</LegalH2>
      <p>
        Cette politique peut être modifiée pour refléter des
        changements légaux ou techniques. La date de dernière mise à
        jour est indiquée en haut de cette page. Toute modification
        substantielle vous sera notifiée par email.
      </p>
    </LegalLayout>
  );
}
