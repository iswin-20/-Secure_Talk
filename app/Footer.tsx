// app/Footer.tsx
export default function Footer() {
  return (
    <footer className="w-full text-center py-4 text-xs text-[rgb(var(--text-muted))] border-t border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
      <a
        href="https://github.com/iswin-20/-Secure_Talk"
        className="underline hover:text-[rgb(var(--text-secondary))] transition-colors"
        target="_blank"
        rel="noopener noreferrer"
      >
        Secure Talk
      </a>
      {" "}— Secure, encrypted chat
    </footer>
  );
}
