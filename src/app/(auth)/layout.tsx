export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Instant<span className="text-blue-600">Check</span>
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            BS7858 Pre-Employment Vetting
          </p>
        </div>

        {/* Auth card */}
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          {children}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Instant Check Ltd. All rights reserved.
        </p>
      </div>
    </div>
  );
}
