import './style.css';
import './heritage.css';
import {installErrorHandling,showSiteError} from './reliability.js';
installErrorHandling();
// Keep the initial public HTML usable if an application chunk cannot load.
const staff=Boolean(document.querySelector('#admin-app'));
const enhance=()=>(staff?import('./admin.js'):import('./main.js')).catch(()=>{
 showSiteError('Interactive features could not load. Check your connection and refresh. Your existing entries have been kept.');
 document.querySelectorAll('form').forEach(form=>form.addEventListener('submit',event=>event.preventDefault()));
});
// Paint the published document before fetching/parsing its interactive bundle.
if(document.querySelector('#public-snapshot'))requestAnimationFrame(()=>requestAnimationFrame(enhance));else enhance();
