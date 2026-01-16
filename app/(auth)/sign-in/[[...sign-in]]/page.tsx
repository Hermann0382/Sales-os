import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex justify-center">
      <SignIn
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
        signUpUrl="/sign-up"
      />
    </div>
  );
}
