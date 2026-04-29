import React from "react";
import { useNavigate } from "react-router-dom";
import { Container, Paper, Typography, Box, Button, Link, Divider } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useTranslation } from "react-i18next";

const PrivacyPage = () => {
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
            {section.subsections
              ? section.subsections.map((sub, si) => (
                  <Box key={si} sx={{ mb: 2, ml: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {sub.heading}
                    </Typography>
                    {renderParagraphs(sub.paragraphs)}
                  </Box>
                ))
              : renderParagraphs(section.paragraphs)}
          </Box>
        ))}

        <Divider sx={{ my: 3 }} />
        <Typography variant="body2" color="text.secondary">
          {lang === "it"
            ? "Questo documento deve essere letto congiuntamente ai "
            : "This document must be read in conjunction with the "}
          <Link
            component="button"
            onClick={() => navigate("/terms")}
            sx={{ verticalAlign: "baseline" }}
          >
            {lang === "it" ? "Termini di Utilizzo" : "Terms of Use"}
          </Link>.
        </Typography>
      </Paper>
    </Container>
  );
};

function renderParagraphs(paragraphs) {
  if (!paragraphs) return null;
  return paragraphs.map((p, j) => {
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
  });
}

const contentEN = {
  title: "Privacy, Authentication, Data Processing and Cookie Policy",
  sections: [
    {
      heading: "1. Purpose of the Document",
      paragraphs: [
        "This document describes, in a concise and transparent manner, how the service manages user authentication, processes certain personal data and technical data necessary for the operation of the platform, uses browser-side persistence tools, and applies technical security measures for access control.",
        "The document is intended for informational purposes and describes the application behavior of the service based on the current software implementation, integrating the general principles already stated in the corporate privacy policy published by Swing:IT.",
      ],
    },
    {
      heading: "2. Data Controller",
      paragraphs: [
        "In accordance with the corporate privacy policy published on the Swing:IT website, the Data Controller is: Software Engineering Italia S.r.l., Via Santa Sofia, 64 c/o Cittadella Universitaria, Dipartimento di Fisica e Astronomia, Catania.",
        "Data Controller contact email: info@softwareengineering.it",
      ],
    },
    {
      heading: "3. Service Access Methods",
      paragraphs: [
        "The service may provide two access methods: local authentication using application credentials, and federated authentication via EGI Check-in.",
      ],
      subsections: [
        {
          heading: "3.1 Local Authentication",
          paragraphs: [
            "In the case of local authentication, the user accesses using username and password.",
            "The password is not stored in plain text in the application database, but exclusively in hashed form using appropriate cryptographic mechanisms.",
          ],
        },
        {
          heading: "3.2 Federated Authentication via EGI Check-in",
          paragraphs: [
            "In the case of federated authentication, the service uses EGI Check-in as an identity federation system. In this flow, the service receives only the information necessary to:",
            [
              "identify the user;",
              "verify access rights to the service;",
              "associate or create the corresponding local application profile.",
            ],
            "Access may be conditional upon the presence of specific federated attributes or entitlements required by the project.",
          ],
        },
      ],
    },
    {
      heading: "4. Data Processed",
      paragraphs: ["The service may process the following categories of data."],
      subsections: [
        {
          heading: "4.1 Identification and Profile Data",
          paragraphs: [
            "The following data may be processed:",
            [
              "username;",
              "first name;",
              "last name;",
              "email address;",
              "application role;",
              "internal account identifiers.",
            ],
            "In the case of federated authentication, technical identifiers from the identity provider may also be processed, such as federated user identifiers and attributes necessary for verifying access authorization.",
          ],
        },
        {
          heading: "4.2 Authentication Data",
          paragraphs: [
            "The following authentication data may be processed:",
            [
              "local access credentials entered by the user;",
              "application authentication tokens;",
              "temporary technical data necessary for completing the federated login.",
            ],
            "Local passwords are not stored in plain text.",
          ],
        },
        {
          heading: "4.3 Service Usage Data",
          paragraphs: [
            "Depending on the features used, the service may process:",
            [
              "data related to 3D environments created or managed by the user;",
              "uploaded files;",
              "objects, configurations and generated content;",
              "information related to jobs, AI generations, exports and downloads;",
              "technical logs necessary for the operation, monitoring and security of the system.",
            ],
            "Within the AI-assisted 3D generation features (AI 3D Builder), the service sends user-uploaded images and related generation parameters to an AI processing system (TRELLIS) installed and managed internally on the Data Controller's infrastructure. Data processed by this component is not transmitted to external third-party services or entities.",
          ],
        },
        {
          heading: "4.4 Automatically Collected Data",
          paragraphs: [
            "In line with the corporate privacy policy, the service may also automatically collect usage data and technical data, such as:",
            [
              "IP address;",
              "network and request identifiers;",
              "date and time of the request;",
              "requested URL or URI;",
              "server response outcome;",
              "browser and operating system characteristics;",
              "technical information useful for security, maintenance and diagnostics.",
            ],
          ],
        },
      ],
    },
    {
      heading: "5. Purpose of Processing",
      paragraphs: [
        "The data indicated above is processed exclusively for purposes related to:",
        [
          "user authentication;",
          "authorization of access to resources;",
          "management of profiles and application roles;",
          "execution of features requested by the user;",
          "protection of the service and prevention of unauthorized access;",
          "operational continuity, maintenance and technical troubleshooting.",
        ],
        "In accordance with the corporate privacy policy, data may also be processed to:",
        [
          "respond to user requests;",
          "provide specific information relating to particular services or features;",
          "comply with legal obligations;",
          "protect the rights of the Data Controller and defend against misuse of the service.",
        ],
      ],
    },
    {
      heading: "6. Application Session Management",
      paragraphs: [
        "The service uses an authentication model based on JWT application tokens for access to protected APIs.",
        "After login: the backend generates an application token; the frontend uses this token to authenticate subsequent requests to protected services; the backend verifies the token validity and the user's role before authorizing access to resources.",
        "In the case of federated authentication, the system also uses additional technical controls, such as the security parameters of the OIDC/OAuth2 protocol with PKCE.",
      ],
    },
    {
      heading: "7. Browser-Side Data Storage",
      paragraphs: [
        "For the correct operation of the application, the browser may store certain technical information, including:",
        [
          "application authentication token;",
          "user role;",
          "interface language preferences.",
        ],
        "This information is used to:",
        [
          "maintain the application session;",
          "customize interface behavior;",
          "authorize requests to the service APIs.",
        ],
      ],
    },
    {
      heading: "8. Cookies",
      subsections: [
        {
          heading: "8.1 Service Application Cookies",
          paragraphs: [
            "Based on the current application implementation, the service does not use proprietary cookies to maintain the application session. The session is primarily managed through application tokens used by the frontend.",
          ],
        },
        {
          heading: "8.2 Third-Party or Infrastructure Cookies",
          paragraphs: [
            "The possible presence of cookies may depend on external or infrastructure components, including:",
            [
              "EGI Check-in federated authentication service;",
              "reverse proxy, web server or hosting services;",
              "technical distribution or security components.",
            ],
            "Any cookies issued by such entities or components must also be evaluated and documented at the infrastructure level.",
          ],
        },
        {
          heading: "8.3 Tracking Tools and Technical Preferences",
          paragraphs: [
            "The corporate privacy policy provides that cookies or similar tools may be used to identify the user, record technical preferences, and support the delivery of the requested service.",
            "Regarding this application, technical code analysis shows that application session management is primarily handled through browser-side application tokens and not through proprietary session cookies.",
          ],
        },
      ],
    },
    {
      heading: "9. Security Measures Applied",
      paragraphs: [
        "The service adopts technical measures consistent with its application model, including:",
        [
          "hashed storage of local passwords;",
          "use of signed application tokens;",
          "role-based control on protected APIs;",
          "resource ownership verification where applicable;",
          "standard protections for the federated flow via state and PKCE;",
          "restriction of federated access to users holding the required entitlements.",
        ],
        "In accordance with the corporate privacy policy, processing is carried out using computer and telematic tools and with measures suitable for preventing unauthorized access, disclosure, modification or destruction of data.",
      ],
    },
    {
      heading: "10. Data Retention",
      paragraphs: [
        "Technical and application data is retained for the time necessary for the operation of the service, account management, application security and the operational needs of the project.",
        "Some information is temporary in nature, such as technical data strictly necessary for completing the federated login flow. Other information, such as accounts, profiles, uploaded content or project data, may remain stored until modification, logical deletion or decommissioning according to the service's operational rules.",
      ],
    },
    {
      heading: "11. Roles and Authorizations",
      paragraphs: [
        "The service applies internal authorization rules based on application roles. In general:",
        [
          "administrators have extended management privileges;",
          "authorized users with an operational role have limited access to permitted resources;",
          "in the case of federated authentication, initial access may depend on authorization attributes managed at the federation level.",
        ],
      ],
    },
    {
      heading: "12. Limitations of This Document",
      paragraphs: [
        "This text describes the behavior of the service from a technical-application perspective and does not replace, where necessary, the legal-organizational documentation relating to:",
        [
          "data processing ownership;",
          "legal bases;",
          "formally approved retention periods;",
          "complete privacy notices pursuant to applicable regulations;",
          "cookie policies at the infrastructure or domain level.",
        ],
      ],
    },
    {
      heading: "13. User Rights",
      paragraphs: [
        "In accordance with the corporate privacy policy, the data subject may request at any time information about their personal data and, within the limits provided by applicable regulations:",
        [
          "obtain confirmation of the existence of the data;",
          "know its content and origin;",
          "request its update, rectification or integration;",
          "request its deletion, anonymization or restriction;",
          "object to processing on legitimate grounds.",
        ],
        "Requests may be addressed to the Data Controller through the contact details indicated in this document.",
      ],
    },
    {
      heading: "14. System Logs and Maintenance",
      paragraphs: [
        "For operational, maintenance and security purposes, the service and any third-party components used may collect system logs. Such logs may also include personal data or technical data, such as the IP address and request information.",
      ],
    },
    {
      heading: "15. Do Not Track",
      paragraphs: [
        "This application does not support \"Do Not Track\" browser requests, unless otherwise indicated by specific third-party services.",
      ],
    },
    {
      heading: "16. Changes to the Document",
      paragraphs: [
        "This document may be updated at any time to reflect changes to the service, authentication flows, data processed, technical or infrastructure components, or applicable regulatory obligations.",
        "Users are invited to periodically consult this page or the corresponding published document.",
      ],
    },
    {
      heading: "17. Contacts",
      paragraphs: [
        "For requests, clarifications or inquiries regarding data processing and the contents of this policy, please contact: info@softwareengineering.it",
      ],
    },
  ],
};

const contentIT = {
  title: "Informativa su Privacy, Autenticazione, Trattamento Dati e Cookie",
  sections: [
    {
      heading: "1. Finalit\u00e0 del documento",
      paragraphs: [
        "Il presente documento descrive, in modo sintetico e trasparente, le modalit\u00e0 con cui il servizio gestisce l'autenticazione degli utenti, tratta alcuni dati personali e dati tecnici necessari al funzionamento della piattaforma, utilizza strumenti di persistenza lato browser e applica misure tecniche di sicurezza per il controllo degli accessi.",
        "Il documento ha finalit\u00e0 informativa e descrive il funzionamento applicativo del servizio sulla base dell'implementazione software attuale, integrando i principi generali gi\u00e0 riportati nella privacy policy aziendale pubblicata da Swing:IT.",
      ],
    },
    {
      heading: "2. Titolare del Trattamento",
      paragraphs: [
        "In coerenza con la privacy policy aziendale pubblicata sul sito Swing:IT, il Titolare del Trattamento \u00e8: Software Engineering Italia S.r.l., Via Santa Sofia, 64 c/o Cittadella Universitaria, Dipartimento di Fisica e Astronomia, Catania.",
        "Email di contatto del Titolare: info@softwareengineering.it",
      ],
    },
    {
      heading: "3. Modalit\u00e0 di accesso al servizio",
      paragraphs: [
        "Il servizio pu\u00f2 prevedere due modalit\u00e0 di accesso: autenticazione locale mediante credenziali applicative e autenticazione federata tramite EGI Check-in.",
      ],
      subsections: [
        {
          heading: "3.1 Autenticazione locale",
          paragraphs: [
            "Nel caso di autenticazione locale, l'utente accede utilizzando nome utente e password.",
            "La password non viene conservata in chiaro nel database applicativo, ma esclusivamente in forma hashata mediante meccanismi crittografici idonei.",
          ],
        },
        {
          heading: "3.2 Autenticazione federata tramite EGI Check-in",
          paragraphs: [
            "Nel caso di autenticazione federata, il servizio utilizza EGI Check-in come sistema di federazione delle identit\u00e0. In questo flusso il servizio riceve esclusivamente le informazioni necessarie a:",
            [
              "identificare l'utente;",
              "verificare i diritti di accesso al servizio;",
              "associare o creare il relativo profilo locale applicativo.",
            ],
            "L'accesso pu\u00f2 essere subordinato alla presenza di specifici attributi o entitlement federati previsti dal progetto.",
          ],
        },
      ],
    },
    {
      heading: "4. Dati trattati",
      paragraphs: ["Il servizio pu\u00f2 trattare le seguenti categorie di dati."],
      subsections: [
        {
          heading: "4.1 Dati identificativi e di profilo",
          paragraphs: [
            "Possono essere trattati i seguenti dati:",
            [
              "username;",
              "nome;",
              "cognome;",
              "indirizzo email;",
              "ruolo applicativo;",
              "identificativi interni dell'account.",
            ],
            "Nel caso di autenticazione federata possono inoltre essere trattati identificativi tecnici provenienti dal provider di identit\u00e0, come gli identificativi utente federati e gli attributi necessari alla verifica dell'abilitazione di accesso.",
          ],
        },
        {
          heading: "4.2 Dati di autenticazione",
          paragraphs: [
            "Possono essere trattati i seguenti dati di autenticazione:",
            [
              "credenziali di accesso locale inserite dall'utente;",
              "token applicativi di autenticazione;",
              "dati tecnici temporanei necessari al completamento del login federato.",
            ],
            "Le password locali non sono memorizzate in chiaro.",
          ],
        },
        {
          heading: "4.3 Dati di utilizzo del servizio",
          paragraphs: [
            "In funzione delle funzionalit\u00e0 utilizzate, il servizio pu\u00f2 trattare:",
            [
              "dati relativi agli ambienti 3D creati o gestiti dall'utente;",
              "file caricati;",
              "oggetti, configurazioni e contenuti generati;",
              "informazioni relative a job, generazioni AI, esportazioni e download;",
              "log tecnici necessari al funzionamento, al monitoraggio e alla sicurezza del sistema.",
            ],
            "Nell'ambito delle funzionalit\u00e0 di generazione 3D assistita da intelligenza artificiale (AI 3D Builder), il servizio invia le immagini caricate dall'utente e i relativi parametri di generazione a un sistema di elaborazione AI (TRELLIS) installato e gestito internamente su infrastruttura del Titolare. I dati elaborati da tale componente non vengono trasmessi a servizi o soggetti terzi esterni.",
          ],
        },
        {
          heading: "4.4 Dati raccolti automaticamente",
          paragraphs: [
            "In linea con quanto indicato nella privacy policy aziendale, il servizio pu\u00f2 inoltre raccogliere automaticamente dati di utilizzo e dati tecnici, quali:",
            [
              "indirizzo IP;",
              "identificativi di rete e di richiesta;",
              "data e ora della richiesta;",
              "URL o URI richiesti;",
              "esito della risposta del server;",
              "caratteristiche del browser e del sistema operativo;",
              "informazioni tecniche utili alla sicurezza, manutenzione e diagnostica.",
            ],
          ],
        },
      ],
    },
    {
      heading: "5. Finalit\u00e0 del trattamento",
      paragraphs: [
        "I dati sopra indicati sono trattati esclusivamente per finalit\u00e0 connesse a:",
        [
          "autenticazione degli utenti;",
          "autorizzazione all'accesso alle risorse;",
          "gestione del profilo e dei ruoli applicativi;",
          "esecuzione delle funzionalit\u00e0 richieste dall'utente;",
          "protezione del servizio e prevenzione di accessi non autorizzati;",
          "continuit\u00e0 operativa, manutenzione e troubleshooting tecnico.",
        ],
        "In coerenza con la privacy policy aziendale, i dati possono inoltre essere trattati per:",
        [
          "rispondere a richieste dell'utente;",
          "fornire informative specifiche relative a servizi o funzionalit\u00e0 particolari;",
          "adempiere a obblighi di legge;",
          "tutelare i diritti del Titolare e difendersi da abusi nell'utilizzo del servizio.",
        ],
      ],
    },
    {
      heading: "6. Modalit\u00e0 di gestione della sessione applicativa",
      paragraphs: [
        "Il servizio utilizza un modello di autenticazione basato su token applicativi JWT per l'accesso alle API protette.",
        "Dopo il login: il backend genera un token applicativo; il frontend utilizza tale token per autenticare le richieste successive verso i servizi protetti; il backend verifica validit\u00e0 del token e ruolo dell'utente prima di autorizzare l'accesso alle risorse.",
        "Nel caso di autenticazione federata, il sistema utilizza inoltre controlli tecnici aggiuntivi, come i parametri di sicurezza del protocollo OIDC/OAuth2 con PKCE.",
      ],
    },
    {
      heading: "7. Memorizzazione dati lato browser",
      paragraphs: [
        "Per il corretto funzionamento dell'applicazione, il browser pu\u00f2 memorizzare alcune informazioni tecniche, tra cui:",
        [
          "token di autenticazione applicativa;",
          "ruolo utente;",
          "preferenze di lingua dell'interfaccia.",
        ],
        "Tali informazioni sono utilizzate per:",
        [
          "mantenere la sessione applicativa;",
          "personalizzare il comportamento dell'interfaccia;",
          "autorizzare le richieste verso le API del servizio.",
        ],
      ],
    },
    {
      heading: "8. Cookie",
      subsections: [
        {
          heading: "8.1 Cookie applicativi del servizio",
          paragraphs: [
            "Sulla base dell'implementazione applicativa attuale, il servizio non utilizza cookie proprietari per mantenere la sessione applicativa. La sessione \u00e8 gestita principalmente tramite token applicativi utilizzati dal frontend.",
          ],
        },
        {
          heading: "8.2 Cookie di terze parti o infrastrutturali",
          paragraphs: [
            "L'eventuale presenza di cookie pu\u00f2 dipendere da componenti esterni o infrastrutturali, tra cui:",
            [
              "servizio federato di autenticazione EGI Check-in;",
              "reverse proxy, web server o servizi di hosting;",
              "componenti tecnici di distribuzione o sicurezza.",
            ],
            "Eventuali cookie erogati da tali soggetti o componenti devono essere valutati e documentati anche a livello infrastrutturale.",
          ],
        },
        {
          heading: "8.3 Strumenti di tracciamento e preferenze tecniche",
          paragraphs: [
            "La privacy policy aziendale prevede che eventuali cookie o strumenti analoghi possano essere usati per identificare l'utente, registrare preferenze tecniche e supportare l'erogazione del servizio richiesto.",
            "Per quanto riguarda questa applicazione, dall'analisi tecnica del codice risulta che la gestione della sessione applicativa avviene principalmente tramite token applicativi lato browser e non tramite cookie proprietari di sessione.",
          ],
        },
      ],
    },
    {
      heading: "9. Misure di sicurezza applicate",
      paragraphs: [
        "Il servizio adotta misure tecniche coerenti con il proprio modello applicativo, tra cui:",
        [
          "memorizzazione hashata delle password locali;",
          "uso di token applicativi firmati;",
          "controllo dei ruoli sulle API protette;",
          "verifica della propriet\u00e0 delle risorse dove previsto;",
          "protezioni standard del flusso federato tramite state e PKCE;",
          "limitazione dell'accesso federato agli utenti in possesso dei diritti previsti.",
        ],
        "In coerenza con la privacy policy aziendale, il trattamento \u00e8 effettuato mediante strumenti informatici e telematici e con misure idonee a prevenire accessi non autorizzati, divulgazione, modifica o distruzione dei dati.",
      ],
    },
    {
      heading: "10. Conservazione dei dati",
      paragraphs: [
        "I dati tecnici e applicativi sono conservati per il tempo necessario al funzionamento del servizio, alla gestione degli account, alla sicurezza applicativa e alle esigenze operative del progetto.",
        "Alcune informazioni hanno natura temporanea, come i dati tecnici strettamente necessari al completamento del flusso di login federato. Altre informazioni, come account, profili, contenuti caricati o dati di progetto, possono restare memorizzate fino a modifica, cancellazione logica o dismissione secondo le regole operative del servizio.",
      ],
    },
    {
      heading: "11. Ruoli e autorizzazioni",
      paragraphs: [
        "Il servizio applica regole di autorizzazione interne basate su ruoli applicativi. In generale:",
        [
          "gli amministratori dispongono di privilegi estesi di gestione;",
          "gli utenti autorizzati con ruolo operativo dispongono di accessi limitati alle risorse consentite;",
          "nel caso di autenticazione federata, l'accesso iniziale pu\u00f2 dipendere da attributi di autorizzazione gestiti a livello di federazione.",
        ],
      ],
    },
    {
      heading: "12. Limitazioni del presente documento",
      paragraphs: [
        "Il presente testo descrive il comportamento del servizio dal punto di vista tecnico-applicativo e non sostituisce, ove necessaria, la documentazione giuridico-organizzativa relativa a:",
        [
          "titolarit\u00e0 del trattamento;",
          "basi giuridiche;",
          "tempi di conservazione formalmente approvati;",
          "informative privacy complete ai sensi della normativa applicabile;",
          "cookie policy di livello infrastrutturale o di dominio.",
        ],
      ],
    },
    {
      heading: "13. Diritti dell'utente",
      paragraphs: [
        "In coerenza con la privacy policy aziendale, l'interessato pu\u00f2 richiedere in qualunque momento informazioni sui propri dati personali e, nei limiti previsti dalla normativa applicabile:",
        [
          "ottenere conferma dell'esistenza dei dati;",
          "conoscerne contenuto e origine;",
          "chiederne aggiornamento, rettifica o integrazione;",
          "chiederne cancellazione, anonimizzazione o limitazione;",
          "opporsi al trattamento per motivi legittimi.",
        ],
        "Le richieste possono essere indirizzate al Titolare del Trattamento tramite i recapiti indicati nel presente documento.",
      ],
    },
    {
      heading: "14. Log di sistema e manutenzione",
      paragraphs: [
        "Per esigenze di funzionamento, manutenzione e sicurezza il servizio e gli eventuali componenti terzi utilizzati possono raccogliere log di sistema. Tali log possono includere anche dati personali o dati tecnici, come l'indirizzo IP e le informazioni di richiesta.",
      ],
    },
    {
      heading: "15. Do Not Track",
      paragraphs: [
        "Questa applicazione non supporta richieste browser di tipo \"Do Not Track\", salvo diversa indicazione eventualmente fornita da servizi terzi specifici.",
      ],
    },
    {
      heading: "16. Modifiche al documento",
      paragraphs: [
        "Il presente documento pu\u00f2 essere aggiornato in qualunque momento per riflettere modifiche al servizio, ai flussi di autenticazione, ai dati trattati, ai componenti tecnici o infrastrutturali, o agli obblighi normativi applicabili.",
        "Gli utenti sono invitati a consultare periodicamente questa pagina o il documento pubblicato corrispondente.",
      ],
    },
    {
      heading: "17. Contatti",
      paragraphs: [
        "Per richieste, chiarimenti o istanze relative al trattamento dei dati e ai contenuti della presente informativa \u00e8 possibile contattare: info@softwareengineering.it",
      ],
    },
  ],
};

export default PrivacyPage;
