import React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App';
import './styles.css';
class ErrorBoundary extends React.Component<React.PropsWithChildren,{error:string}>{state={error:''};static getDerivedStateFromError(e:Error){return {error:e.message};}render(){return this.state.error?<main className="p-12"><h1>Something interrupted this view.</h1><p>Your saved study data remains in SQLite.</p><button onClick={()=>location.reload()}>Reload application</button><pre>{this.state.error}</pre></main>:this.props.children;}}
createRoot(document.getElementById('root')!).render(<React.StrictMode><ErrorBoundary><BrowserRouter><App/></BrowserRouter></ErrorBoundary></React.StrictMode>);
