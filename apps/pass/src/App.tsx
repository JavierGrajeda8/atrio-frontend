import { t } from "./messages";
import { useOnline } from "./useOnline";

interface AppProps {
  /** Token del fragmento de la URL (SEC-35). Solo en memoria: no se muestra ni se envía. */
  token: string | null;
}

// Ícono PROVISIONAL (ver FR-06a): se reemplaza con el definitivo. Decorativo, va junto a texto.
function QrIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" class="qr-icon">
      <path
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linejoin="round"
        d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v3M14 20h3M20 20h1"
      />
    </svg>
  );
}

function Field({ label }: { label: string }) {
  return (
    <div class="field">
      <dt>{label}</dt>
      <dd>
        <span class="skeleton" aria-hidden="true" />
      </dd>
    </div>
  );
}

// Solo estructura: nunca el nombre del residente ni la unidad (SEC-35). Los datos reales llegan
// al canjear el token, que queda fuera de este issue.
function PassStructure() {
  return (
    <section class="pass" aria-busy="true" aria-label={t("pass.title")}>
      <p role="status" class="muted">
        {t("pass.loading")}
      </p>
      <dl>
        <Field label={t("pass.field.residential")} />
        <Field label={t("pass.field.address")} />
        <Field label={t("pass.field.visitor")} />
        <Field label={t("pass.field.validity")} />
      </dl>
      <button type="button" class="directions" disabled>
        {t("pass.directions")}
      </button>
      <div class="qr" role="img" aria-label={t("pass.qr")}>
        <QrIcon />
      </div>
      <dl>
        <Field label={t("pass.field.code")} />
        <Field label={t("pass.field.status")} />
      </dl>
    </section>
  );
}

function InvalidLink() {
  return (
    <section class="invalid">
      <h2>{t("pass.invalid.title")}</h2>
      <p>{t("pass.invalid.body")}</p>
    </section>
  );
}

export function App({ token }: AppProps) {
  const online = useOnline();
  return (
    <>
      {online ? null : (
        <p role="status" class="offline">
          {t("pass.offline")}
        </p>
      )}
      <main>
        <h1>{t("pass.title")}</h1>
        {token === null ? <InvalidLink /> : <PassStructure />}
      </main>
      <footer>{t("pass.footer")}</footer>
    </>
  );
}
