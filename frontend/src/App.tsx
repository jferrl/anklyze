import './i18n/config';
import { FractureForm } from './components/FractureForm';
import { LanguageSwitcher } from './components/LanguageSwitcher';

function App() {
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>
        <FractureForm />
      </div>
    </div>
  );
}

export default App;
