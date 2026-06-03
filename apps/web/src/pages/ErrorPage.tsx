import { Link, useRouteError, isRouteErrorResponse } from 'react-router-dom';

type ErrorPageProps = {
  status?: number;
};

export function ErrorPage({ status }: ErrorPageProps) {
  const routeError = useRouteError();
  const resolvedStatus = resolveStatus(status, routeError);
  const message = resolveMessage(resolvedStatus, routeError);

  return (
    <section className="page">
      <h1>{resolvedStatus}</h1>
      <p>{message}</p>
      <p>
        <Link to="/">Return home</Link>
      </p>
    </section>
  );
}

function resolveStatus(
  status: number | undefined,
  routeError: unknown,
): number {
  if (status !== undefined) {
    return status;
  }
  if (isRouteErrorResponse(routeError)) {
    return routeError.status;
  }
  return 500;
}

function resolveMessage(status: number, routeError: unknown): string {
  if (isRouteErrorResponse(routeError) && routeError.statusText) {
    return routeError.statusText;
  }
  if (status === 404) {
    return 'The page you requested does not exist.';
  }
  return 'Something went wrong. Try again or return home.';
}
