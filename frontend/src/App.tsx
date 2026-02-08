import { useUser } from './hooks/useUser';
import { LoginScreen } from './components/LoginScreen/LoginScreen';
import { ChatScreen } from './components/ChatScreen/ChatScreen';

function App() {
  const { user, login, logout } = useUser();

  if (!user) {
    return <LoginScreen onLogin={login} />;
  }

  return <ChatScreen user={user} onLogout={logout} />;
}

export default App;
