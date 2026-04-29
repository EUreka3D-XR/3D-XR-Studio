import React from "react";
import { useNavigate } from "react-router-dom";
import { Container, Paper, Typography, Box, Button, Link, Divider } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useTranslation } from "react-i18next";

const TermsPage = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const lang = i18n.language;

  const content = lang === "it" ? contentIT : contentEN;

  return (
    <Container maxWidth="md" sx={{ my: 4 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate("/")}
        sx={{ mb: 2 }}
      >
        {lang === "it" ? "Torna al login" : "Back to login"}
      </Button>
      <Paper elevation={3} sx={{ p: { xs: 3, md: 5 }, borderRadius: 3 }}>
        <Typography variant="h4" color="primary" gutterBottom>
          {content.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          <strong>{lang === "it" ? "Servizio" : "Service"}:</strong> 3D XR Studio / AI 3D Builder
          &nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>{lang === "it" ? "Versione" : "Version"}:</strong> 1.0
          &nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>{lang === "it" ? "Data" : "Date"}:</strong> 7 {lang === "it" ? "aprile" : "April"} 2026
        </Typography>
        <Divider sx={{ mb: 3 }} />

        {content.sections.map((section, i) => (
          <Box key={i} sx={{ mb: 3 }}>
            <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
              {section.heading}
            </Typography>
            {section.paragraphs.map((p, j) => {
              if (Array.isArray(p)) {
                return (
                  <Box component="ul" key={j} sx={{ pl: 3, my: 1 }}>
                    {p.map((item, k) => (
                      <li key={k}>
                        <Typography variant="body1">{item}</Typography>
                      </li>
                    ))}
                  </Box>
                );
              }
              return (
                <Typography key={j} variant="body1" sx={{ mb: 1 }}>
                  {p}
                </Typography>
              );
            })}
          </Box>
        ))}

        <Divider sx={{ my: 3 }} />
        <Typography variant="body2" color="text.secondary">
          {lang === "it"
            ? "Questo documento deve essere letto congiuntamente alla "
            : "This document must be read in conjunction with the "}
          <Link
            component="button"
            onClick={() => navigate("/privacy")}
            sx={{ verticalAlign: "baseline" }}
          >
            {lang === "it"
              ? "Informativa su Privacy, Autenticazione, Trattamento Dati e Cookie"
              : "Privacy, Authentication, Data Processing and Cookie Policy"}
          </Link>.
        </Typography>
      </Paper>
    </Container>
  );
};

const contentEN = {
  title: "Terms of Use",
  sections: [
    {
      heading: "1. Purpose",
      paragraphs: [
        "These Terms of Use govern access to and use of the 3D XR Studio and AI 3D Builder service, made available by Software Engineering Italia S.r.l.",
        "Access to and use of the service implies acceptance of these Terms of Use. If the user does not intend to accept them, they must refrain from using the service.",
      ],
    },
    {
      heading: "2. Service Provider",
      paragraphs: [
        "The service is made available by: Software Engineering Italia S.r.l., Via Santa Sofia, 64 c/o Cittadella Universitaria, Dipartimento di Fisica e Astronomia, Catania.",
        "Contact: info@softwareengineering.it",
      ],
    },
    {
      heading: "3. Description of the Service",
      paragraphs: [
        "The service provides application features for:",
        [
          "authenticated access to digital tools of the project;",
          "management of virtual environments, objects, configurations and associated content;",
          "use of advanced features for creating, editing, exporting and generating 3D content;",
          "access to tools based on local or federated authentication, where applicable.",
        ],
        "The features actually available may vary depending on:",
        [
          "the user profile;",
          "the assigned role;",
          "the operating environment;",
          "the activation or maintenance status of the service.",
        ],
      ],
    },
    {
      heading: "4. Access Requirements",
      paragraphs: [
        "Access to the service may occur, depending on the applicable configuration, through:",
        [
          "local credentials;",
          "federated authentication via EGI Check-in.",
        ],
        "For certain features or areas of the service, a specific application role or possession of certain federated authorization requirements may be necessary.",
        "The user agrees to:",
        [
          "provide correct, up-to-date and complete information, where required;",
          "use only credentials or federated identities to which they are legitimately entitled;",
          "not share their access credentials with third parties;",
          "safeguard their authentication tools with due diligence.",
        ],
      ],
    },
    {
      heading: "5. Local Accounts and Federated Access",
      paragraphs: [
        "The service may allow the coexistence of local accounts managed by the application and accounts authenticated via EGI Check-in.",
        "Federated authentication does not necessarily exclude the existence of separate local accounts. Final access to the service remains subject to the authorization rules established by the application and, where applicable, to the verification of federated entitlements or groups.",
      ],
    },
    {
      heading: "6. User Roles and Authorizations",
      paragraphs: [
        "The service adopts an authorization model based on application roles. In general:",
        [
          "administrator users have extended management privileges;",
          "users with an operational role, including editors, can access only the features compatible with their profile;",
          "some resources may be visible or editable only by the person who created them or by system administrators.",
        ],
        "The assignment or revocation of roles is carried out according to the service's operational rules and, in the case of federated access, may also depend on onboarding and authorization processes defined within the project.",
      ],
    },
    {
      heading: "7. Onboarding and Editor Role",
      paragraphs: [
        "Access to specific features, including the editor role, may require an onboarding process or prior verification. This process may include:",
        [
          "joining the required community or federated group;",
          "manual approval or administrative verification;",
          "confirmation of specific terms of use;",
          "possible provision of additional information useful for evaluating the access request.",
        ],
        "The assignment of the editor role does not constitute an automatic right of the user, but a privilege granted by the service manager or authorized parties, revocable in case of violation of these Terms or applicable policies.",
      ],
    },
    {
      heading: "8. Permitted Use",
      paragraphs: [
        "The user agrees to use the service exclusively for lawful, fair purposes consistent with the objectives of the project and the nature of the service. It is permitted to use the service to:",
        [
          "access features for which the user is authorized;",
          "create, manage or modify content permitted by their role;",
          "upload materials to which they are legitimately entitled;",
          "use the tools made available in accordance with the technical and organizational instructions received.",
        ],
      ],
    },
    {
      heading: "9. Prohibited Uses",
      paragraphs: [
        "It is expressly prohibited to:",
        [
          "use the service in violation of laws, regulations or third-party rights;",
          "attempt to access unauthorized resources, accounts or areas;",
          "share, transfer or make available to third parties one's own credentials or access;",
          "upload, transmit or make available unlawful, defamatory, fraudulent, harmful content or content lacking the necessary authorizations;",
          "use the service for spam, unauthorized scraping, abusive automation or activities comparable to malicious bots;",
          "compromise, hinder or attempt to compromise the security, integrity or availability of the service;",
          "use the service for purposes other than those permitted by the project or the assigned role.",
        ],
      ],
    },
    {
      heading: "10. Content Uploaded or Generated by the User",
      paragraphs: [
        "The user remains responsible for the content, data, files, models, images or other materials uploaded, entered or generated through the service.",
        "The user declares and warrants that they:",
        [
          "hold the rights, licenses or authorizations necessary for the use of the content entered into the service;",
          "do not violate intellectual property rights, confidentiality, data protection or other third-party rights;",
          "assume responsibility for the content published, uploaded or shared.",
        ],
        "The service manager assumes no preventive responsibility for content uploaded by users, without prejudice to the right to suspend or remove content in case of violations, well-founded reports or security requirements.",
      ],
    },
    {
      heading: "11. Service Availability",
      paragraphs: [
        "The service is provided on an as-available basis and may be subject to:",
        [
          "scheduled maintenance;",
          "technical updates;",
          "temporary suspensions;",
          "capacity or access limitations;",
          "unavailability due to technical, infrastructural or third-party factors.",
        ],
        "Software Engineering Italia S.r.l. does not guarantee that the service will always be continuous, error-free or available without interruptions.",
      ],
    },
    {
      heading: "12. Security and Protection Measures",
      paragraphs: [
        "The service manager adopts reasonable technical and organizational measures to protect the service and user access.",
        "The user agrees to cooperate with the security of the service, promptly reporting:",
        [
          "suspicious access;",
          "improper use of the account;",
          "observed vulnerabilities;",
          "malfunctions that may affect security.",
        ],
      ],
    },
    {
      heading: "13. Suspension, Limitation and Revocation of Access",
      paragraphs: [
        "The service manager reserves the right to temporarily suspend access, limit certain features, revoke accounts or roles, or reject onboarding or activation requests, in cases where this is necessary for:",
        [
          "security reasons;",
          "maintenance or protection of the infrastructure;",
          "violation of these Terms;",
          "improper use of the service;",
          "non-compliance with applicable policies;",
          "requests from competent authorities or legal requirements.",
        ],
      ],
    },
    {
      heading: "14. Intellectual Property",
      paragraphs: [
        "Unless otherwise indicated, the software, service structure, interface, trademarks, logos, documentation and content made available by the manager remain the property of the respective rights holders.",
        "Use of the service does not entail any transfer of intellectual property rights in favor of the user, except as expressly provided.",
      ],
    },
    {
      heading: "15. Limitation of Liability",
      paragraphs: [
        "To the extent permitted by applicable law, the service manager shall not be liable for direct or indirect damages arising from:",
        [
          "improper use of the service by the user;",
          "temporary unavailability of the service;",
          "loss of access due to compromised or poorly safeguarded credentials;",
          "content uploaded by users;",
          "malfunctions of third-party services, including federated authentication systems or external infrastructure components.",
        ],
        "Nothing in these Terms excludes or limits liability that cannot be excluded by law.",
      ],
    },
    {
      heading: "16. Personal Data Protection",
      paragraphs: [
        "The processing of personal data related to the use of the service is governed by the Privacy, Authentication, Data Processing and Cookie Policy published or made available by the service manager.",
        "The user is invited to consult these documents before using the service.",
      ],
    },
    {
      heading: "17. Changes to the Terms of Use",
      paragraphs: [
        "Software Engineering Italia S.r.l. reserves the right to update or modify these Terms of Use at any time.",
        "Changes will take effect from the date of publication of the updated version, unless otherwise indicated. Continued use of the service following publication constitutes acceptance of the updated Terms.",
      ],
    },
    {
      heading: "18. Applicable Law and Contacts",
      paragraphs: [
        "These Terms of Use are governed by the applicable law identified according to current regulations.",
        "For requests, clarifications or reports regarding the service or these Terms of Use, please contact: info@softwareengineering.it",
      ],
    },
  ],
};

const contentIT = {
  title: "Termini di Utilizzo",
  sections: [
    {
      heading: "1. Oggetto",
      paragraphs: [
        "I presenti Termini di Utilizzo disciplinano l'accesso e l'uso del servizio 3D XR Studio e AI 3D Builder, reso disponibile da Software Engineering Italia S.r.l.",
        "L'accesso e l'utilizzo del servizio comportano l'accettazione dei presenti Termini di Utilizzo. Qualora l'utente non intenda accettarli, \u00e8 tenuto a non utilizzare il servizio.",
      ],
    },
    {
      heading: "2. Titolare del servizio",
      paragraphs: [
        "Il servizio \u00e8 reso disponibile da: Software Engineering Italia S.r.l., Via Santa Sofia, 64 c/o Cittadella Universitaria, Dipartimento di Fisica e Astronomia, Catania.",
        "Contatto: info@softwareengineering.it",
      ],
    },
    {
      heading: "3. Descrizione del servizio",
      paragraphs: [
        "Il servizio mette a disposizione funzionalit\u00e0 applicative per:",
        [
          "accesso autenticato a strumenti digitali del progetto;",
          "gestione di ambienti virtuali, oggetti, configurazioni e contenuti associati;",
          "utilizzo di funzionalit\u00e0 avanzate per la creazione, modifica, esportazione e generazione di contenuti 3D;",
          "accesso a strumenti basati su autenticazione locale o federata, ove previsto.",
        ],
        "Le funzionalit\u00e0 effettivamente disponibili possono variare in base:",
        [
          "al profilo utente;",
          "al ruolo assegnato;",
          "all'ambiente di esercizio;",
          "allo stato di attivazione o manutenzione del servizio.",
        ],
      ],
    },
    {
      heading: "4. Requisiti di accesso",
      paragraphs: [
        "L'accesso al servizio pu\u00f2 avvenire, a seconda della configurazione applicabile, tramite:",
        [
          "credenziali locali;",
          "autenticazione federata tramite EGI Check-in.",
        ],
        "Per alcune funzionalit\u00e0 o aree del servizio pu\u00f2 essere richiesto un ruolo applicativo specifico o il possesso di determinati requisiti di autorizzazione federata.",
        "L'utente si impegna a:",
        [
          "fornire informazioni corrette, aggiornate e complete, ove richiesto;",
          "utilizzare esclusivamente credenziali o identit\u00e0 federate di cui abbia titolo legittimo;",
          "non condividere con terzi le proprie credenziali di accesso;",
          "custodire con diligenza i propri strumenti di autenticazione.",
        ],
      ],
    },
    {
      heading: "5. Account locali e accessi federati",
      paragraphs: [
        "Il servizio pu\u00f2 consentire la coesistenza di account locali gestiti dall'applicazione e account autenticati tramite EGI Check-in.",
        "L'autenticazione federata non esclude necessariamente la presenza di account locali separati. L'accesso finale al servizio resta subordinato alle regole di autorizzazione previste dall'applicazione e, ove applicabile, alla verifica di entitlement o gruppi federati.",
      ],
    },
    {
      heading: "6. Ruoli utente e autorizzazioni",
      paragraphs: [
        "Il servizio adotta un modello di autorizzazione basato su ruoli applicativi. In generale:",
        [
          "gli utenti amministratori dispongono di privilegi estesi di gestione;",
          "gli utenti con ruolo operativo, inclusi gli editor, possono accedere alle sole funzionalit\u00e0 compatibili con il loro profilo;",
          "alcune risorse possono essere visibili o modificabili esclusivamente dal soggetto che le ha create o dagli amministratori del sistema.",
        ],
        "L'assegnazione o la revoca dei ruoli avviene secondo le regole operative del servizio e, nel caso di accesso federato, pu\u00f2 dipendere anche dai processi di onboarding e autorizzazione definiti nell'ambito del progetto.",
      ],
    },
    {
      heading: "7. Onboarding e ruolo editor",
      paragraphs: [
        "Per l'accesso a specifiche funzionalit\u00e0, incluso il ruolo di editor, pu\u00f2 essere richiesto un processo di onboarding o una verifica preventiva. Tale processo pu\u00f2 prevedere:",
        [
          "adesione alla comunit\u00e0 o al gruppo federato richiesto;",
          "approvazione manuale o verifica amministrativa;",
          "conferma di condizioni di utilizzo specifiche;",
          "eventuale fornitura di informazioni integrative utili alla valutazione della richiesta di accesso.",
        ],
        "L'assegnazione del ruolo editor non costituisce un diritto automatico dell'utente, ma una facolt\u00e0 concessa dal gestore del servizio o dai soggetti autorizzati, revocabile in caso di violazione dei presenti Termini o delle policy applicabili.",
      ],
    },
    {
      heading: "8. Uso consentito",
      paragraphs: [
        "L'utente si impegna a utilizzare il servizio esclusivamente per finalit\u00e0 lecite, corrette e coerenti con gli scopi del progetto e con la natura del servizio. \u00c8 consentito utilizzare il servizio per:",
        [
          "accedere alle funzionalit\u00e0 per cui si \u00e8 autorizzati;",
          "creare, gestire o modificare contenuti consentiti dal proprio ruolo;",
          "caricare materiali di cui si dispone legittimamente;",
          "utilizzare gli strumenti messi a disposizione in modo conforme alle istruzioni tecniche e organizzative ricevute.",
        ],
      ],
    },
    {
      heading: "9. Usi vietati",
      paragraphs: [
        "\u00c8 espressamente vietato:",
        [
          "utilizzare il servizio in violazione di leggi, regolamenti o diritti di terzi;",
          "tentare di accedere a risorse, account o aree non autorizzate;",
          "condividere, cedere o mettere a disposizione di terzi le proprie credenziali o il proprio accesso;",
          "caricare, trasmettere o rendere disponibili contenuti illeciti, diffamatori, fraudolenti, lesivi o privi delle necessarie autorizzazioni;",
          "utilizzare il servizio per spam, scraping non autorizzato, automazioni abusive o attivit\u00e0 assimilabili a bot malevoli;",
          "compromettere, ostacolare o tentare di compromettere la sicurezza, l'integrit\u00e0 o la disponibilit\u00e0 del servizio;",
          "utilizzare il servizio per finalit\u00e0 diverse da quelle consentite dal progetto o dal ruolo assegnato.",
        ],
      ],
    },
    {
      heading: "10. Contenuti caricati o generati dall'utente",
      paragraphs: [
        "L'utente resta responsabile dei contenuti, dati, file, modelli, immagini o altri materiali caricati, immessi o generati tramite il servizio.",
        "L'utente dichiara e garantisce di:",
        [
          "disporre dei diritti, licenze o autorizzazioni necessari all'uso dei contenuti immessi nel servizio;",
          "non violare diritti di propriet\u00e0 intellettuale, riservatezza, protezione dei dati o altri diritti di terzi;",
          "assumersi la responsabilit\u00e0 per i contenuti pubblicati, caricati o condivisi.",
        ],
        "Il gestore del servizio non assume alcuna responsabilit\u00e0 preventiva sul contenuto caricato dagli utenti, ferma restando la facolt\u00e0 di sospendere o rimuovere contenuti in caso di violazioni, segnalazioni fondate o esigenze di sicurezza.",
      ],
    },
    {
      heading: "11. Disponibilit\u00e0 del servizio",
      paragraphs: [
        "Il servizio \u00e8 fornito secondo disponibilit\u00e0 e pu\u00f2 essere soggetto a:",
        [
          "manutenzione programmata;",
          "aggiornamenti tecnici;",
          "sospensioni temporanee;",
          "limitazioni di capacit\u00e0 o accesso;",
          "indisponibilit\u00e0 dovute a fattori tecnici, infrastrutturali o di terze parti.",
        ],
        "Software Engineering Italia S.r.l. non garantisce che il servizio sia sempre continuo, privo di errori o disponibile senza interruzioni.",
      ],
    },
    {
      heading: "12. Sicurezza e misure di protezione",
      paragraphs: [
        "Il gestore del servizio adotta misure tecniche e organizzative ragionevoli per proteggere il servizio e gli accessi degli utenti.",
        "L'utente si impegna a collaborare alla sicurezza del servizio, segnalando tempestivamente:",
        [
          "accessi sospetti;",
          "uso improprio dell'account;",
          "vulnerabilit\u00e0 osservate;",
          "malfunzionamenti che possano incidere sulla sicurezza.",
        ],
      ],
    },
    {
      heading: "13. Sospensione, limitazione e revoca dell'accesso",
      paragraphs: [
        "Il gestore del servizio si riserva il diritto di sospendere temporaneamente l'accesso, limitare alcune funzionalit\u00e0, revocare account o ruoli, o rifiutare richieste di onboarding o abilitazione, nei casi in cui ci\u00f2 sia necessario per:",
        [
          "ragioni di sicurezza;",
          "manutenzione o protezione dell'infrastruttura;",
          "violazione dei presenti Termini;",
          "uso improprio del servizio;",
          "mancato rispetto delle policy applicabili;",
          "richieste provenienti da autorit\u00e0 competenti o esigenze legali.",
        ],
      ],
    },
    {
      heading: "14. Propriet\u00e0 intellettuale",
      paragraphs: [
        "Salvo diversa indicazione, il software, la struttura del servizio, l'interfaccia, i marchi, i loghi, la documentazione e i contenuti messi a disposizione dal gestore restano di titolarit\u00e0 dei rispettivi aventi diritto.",
        "L'utilizzo del servizio non comporta alcun trasferimento di diritti di propriet\u00e0 intellettuale in favore dell'utente, salvo quanto espressamente previsto.",
      ],
    },
    {
      heading: "15. Limitazione di responsabilit\u00e0",
      paragraphs: [
        "Nei limiti consentiti dalla normativa applicabile, il gestore del servizio non sar\u00e0 responsabile per danni diretti o indiretti derivanti da:",
        [
          "uso improprio del servizio da parte dell'utente;",
          "indisponibilit\u00e0 temporanea del servizio;",
          "perdita di accesso dovuta a credenziali compromesse o mal custodite;",
          "contenuti caricati dagli utenti;",
          "malfunzionamenti di servizi terzi, inclusi sistemi di autenticazione federata o componenti infrastrutturali esterni.",
        ],
        "Resta fermo che nulla nei presenti Termini esclude o limita responsabilit\u00e0 che non possano essere escluse per legge.",
      ],
    },
    {
      heading: "16. Protezione dei dati personali",
      paragraphs: [
        "Il trattamento dei dati personali connesso all'utilizzo del servizio \u00e8 disciplinato dall'Informativa su Privacy, Autenticazione, Trattamento Dati e Cookie pubblicata o resa disponibile dal gestore del servizio.",
        "L'utente \u00e8 invitato a consultare tali documenti prima di utilizzare il servizio.",
      ],
    },
    {
      heading: "17. Modifiche ai Termini di Utilizzo",
      paragraphs: [
        "Software Engineering Italia S.r.l. si riserva il diritto di aggiornare o modificare i presenti Termini di Utilizzo in qualunque momento.",
        "Le modifiche avranno effetto dalla data di pubblicazione della versione aggiornata, salvo diversa indicazione. L'uso continuato del servizio successivamente alla pubblicazione costituisce accettazione dei Termini aggiornati.",
      ],
    },
    {
      heading: "18. Legge applicabile e contatti",
      paragraphs: [
        "I presenti Termini di Utilizzo sono regolati dalla legge applicabile individuata secondo le norme vigenti.",
        "Per richieste, chiarimenti o segnalazioni relative al servizio o ai presenti Termini di Utilizzo \u00e8 possibile contattare: info@softwareengineering.it",
      ],
    },
  ],
};

export default TermsPage;
