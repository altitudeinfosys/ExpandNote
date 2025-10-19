export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-center max-w-2xl px-4">
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
          ExpandNote
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
          AI-powered note-taking with voice input, smart tagging, and automated content processing
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/login"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Get Started
          </a>
          <a
            href="/about"
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            Learn More
          </a>
        </div>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Voice to Text</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Create notes using voice input powered by OpenAI Whisper
            </p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">AI Profiles</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Automate content processing with custom AI prompts triggered by tags
            </p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Offline First</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Work seamlessly offline with automatic sync across all devices
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
