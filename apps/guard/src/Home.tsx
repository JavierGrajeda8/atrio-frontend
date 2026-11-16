import { FormattedMessage } from "@atrio/i18n";
import { Button } from "@atrio/ui";
import { CameraIcon, IdCardIcon, KeypadIcon } from "./icons";
import { Link, ROUTES } from "./router";

export function Home() {
  return (
    <nav className="flex flex-col gap-4">
      <Button asChild size="lg" className="w-full py-6">
        <Link to={ROUTES.scan}>
          <CameraIcon />
          <FormattedMessage id="guard.home.scan" />
        </Link>
      </Button>
      <Button asChild size="lg" variant="secondary" className="w-full">
        <Link to={ROUTES.code}>
          <KeypadIcon />
          <FormattedMessage id="guard.home.code" />
        </Link>
      </Button>
      <Button asChild size="lg" variant="secondary" className="w-full">
        <Link to={ROUTES.walkIn}>
          <IdCardIcon />
          <FormattedMessage id="guard.home.walkIn" />
        </Link>
      </Button>
    </nav>
  );
}

/** Ruta vacía: la pantalla real (escaneo, código, sin pase) llega en milestones posteriores. */
export function EmptyRoute({
  messageId,
}: {
  messageId: "guard.home.scan" | "guard.home.code" | "guard.home.walkIn";
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-xl font-semibold">
        <FormattedMessage id={messageId} />
      </h2>
      <Button asChild size="lg" variant="secondary" className="w-full">
        <Link to={ROUTES.home}>
          <FormattedMessage id="guard.route.back" />
        </Link>
      </Button>
    </section>
  );
}
