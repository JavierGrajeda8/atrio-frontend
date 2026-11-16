import { FormattedMessage } from "@atrio/i18n";
import { ConnectionIndicator } from "./ConnectionIndicator";
import { EmptyRoute, Home } from "./Home";
import { ROUTES, usePath } from "./router";
import { useConnection } from "./useConnection";
import type { GuardDb } from "./db/db";

function Route({ path }: { path: string }) {
  switch (path) {
    case ROUTES.scan:
      return <EmptyRoute messageId="guard.home.scan" />;
    case ROUTES.code:
      return <EmptyRoute messageId="guard.home.code" />;
    case ROUTES.walkIn:
      return <EmptyRoute messageId="guard.home.walkIn" />;
    default:
      return <Home />;
  }
}

export function App({ db }: { db?: GuardDb }) {
  const path = usePath();
  const connection = useConnection(db);

  return (
    <div
      data-app="guard"
      className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 py-6 font-body text-md text-text"
    >
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-2xl font-semibold">
          <FormattedMessage id="guard.title" />
        </h1>
        <ConnectionIndicator state={connection} />
      </header>
      <main>
        <Route path={path} />
      </main>
    </div>
  );
}
