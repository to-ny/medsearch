export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white py-8 dark:border-gray-800 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="flex justify-end">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Made with &lt;3 by{' '}
            <a
              href="https://to-ny.github.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
            >
              to-ny
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
