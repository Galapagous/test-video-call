import { RouterProvider } from 'react-router-dom';
import './App.css';
import router from './route';
import { Toaster } from 'sonner';

function App() {
  return (
    <>
      <Toaster position='top-right' richColors/>
      <RouterProvider router={router}/>
    </>
  );
}

export default App;
