import React from 'react';
import Widget from './components/Widget';

const App: React.FC = () => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-2 bg-slate-50">
      <main className="w-full max-w-5xl mx-auto">
        {/* Widget Container */}
        <Widget />
        
        <footer className="text-center mt-4 text-slate-400 text-xs">
          <p>© 2024 PhotoRatio Pro.</p>
        </footer>
      </main>
    </div>
  );
};

export default App;