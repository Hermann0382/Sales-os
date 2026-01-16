import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex justify-center">
      <SignUp
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'glass-card',
            headerTitle: 'text-foreground',
            headerSubtitle: 'text-muted-foreground',
            formButtonPrimary: 'control-btn control-btn-primary w-full',
            formFieldInput: 'border-input focus:ring-primary',
            footerActionLink: 'text-primary hover:text-primary/80',
          },
        }}
        fallbackRedirectUrl="/agent/dashboard"
        signInUrl="/sign-in"
      />
    </div>
  );
}
