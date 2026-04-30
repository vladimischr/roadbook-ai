import React from "react";

interface Props {
  name: string;
  children: React.ReactNode;
  /** Optional callback when the user clicks "Modifier" in the fallback. */
  onEdit?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Local error boundary for editorial sections of the roadbook page.
 * Catches render-time errors (e.g. accessing undefined fields on legacy
 * roadbook content) and renders a graceful fallback instead of unmounting
 * the whole React tree (which would produce a blank page).
 */
export class SectionErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error(
      `[Section "${this.props.name}"] Erreur de rendu:`,
      error,
      errorInfo,
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="mx-auto max-w-2xl px-6 py-12 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {this.props.name}
          </p>
          <p className="mt-3 font-display text-[16px] italic leading-relaxed text-foreground/70">
            Cette section n'a pas pu s'afficher.
            <br />
            Modifie le roadbook pour la compléter.
          </p>
          {this.state.error?.message && (
            <p className="mt-3 text-[11px] text-muted-foreground/70">
              {this.state.error.message}
            </p>
          )}
        </section>
      );
    }
    return this.props.children;
  }
}
