'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            ExpandNote
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {user.email}
            </span>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome to ExpandNote!
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              You&apos;re successfully logged in as <strong>{user.email}</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                Create Notes
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                Start creating notes with markdown support
              </p>
              <button className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium">
                Coming Soon →
              </button>
            </div>

            <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                Voice Input
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                Record audio and transcribe with AI
              </p>
              <button className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium">
                Coming Soon →
              </button>
            </div>

            <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                AI Profiles
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                Set up AI automation for your notes
              </p>
              <button className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium">
                Coming Soon →
              </button>
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
              Authentication Working!
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Your authentication system is set up and working correctly. The following features are now active:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-blue-700 dark:text-blue-400">
              <li>✓ Email/Password sign up with verification</li>
              <li>✓ Email verification via callback</li>
              <li>✓ Login with session management</li>
              <li>✓ Protected routes (this dashboard)</li>
              <li>✓ Sign out functionality</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
