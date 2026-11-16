import { useIntl } from "@atrio/i18n";
import type { ConnectionState } from "./connection";
import { AlertIcon, WifiIcon, WifiOffIcon } from "./icons";

// Nunca solo color (BRAND §4.3): cada estado lleva ícono con forma propia, texto y el borde de
// color. El texto usa el color de texto normal: así conserva el contraste máximo.
const looks = {
  online: { Icon: WifiIcon, border: "border-success", icon: "text-success" },
  offline: { Icon: WifiOffIcon, border: "border-warning-text", icon: "text-warning-text" },
  expired: { Icon: AlertIcon, border: "border-danger", icon: "text-danger" },
} as const;

export function ConnectionIndicator({ state }: { state: ConnectionState }) {
  const intl = useIntl();
  const { Icon, border, icon } = looks[state.kind];

  let text: string;
  if (state.kind === "online") {
    text = intl.formatMessage({ id: "guard.connection.online" });
  } else if (state.kind === "expired") {
    text = intl.formatMessage({ id: "guard.connection.expired" });
  } else if (state.ageMinutes < 1) {
    text = intl.formatMessage({ id: "guard.connection.offlineJustNow" });
  } else if (state.ageMinutes < 60) {
    text = intl.formatMessage(
      { id: "guard.connection.offlineMinutes" },
      { minutes: state.ageMinutes },
    );
  } else {
    text = intl.formatMessage(
      { id: "guard.connection.offlineHours" },
      { hours: Math.floor(state.ageMinutes / 60) },
    );
  }

  return (
    <div
      role="status"
      data-state={state.kind}
      className={`flex items-center gap-3 rounded-md border-2 bg-surface px-3 py-2 text-md font-bold text-text ${border}`}
    >
      <Icon className={icon} />
      <span>{text}</span>
    </div>
  );
}
