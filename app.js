// Firebase-backed starter for Sasuke Uchiha Anime Vault.
// 1) Paste your Firebase web app config below.
// 2) Enable Authentication > Email/Password, Firestore, and Storage.
// 3) Create Firestore collection "admins" with document ID equal to the admin user's Firebase UID.
// IMPORTANT: Use Firestore and Storage rules from README.md. Never put service-account keys in frontend code.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "PASTE_YOUR_FIREBASE_WEB_API_KEY",
  authDomain: "sasuke-uchiha-website.firebaseapp.com",
  projectId: "sasuke-uchiha-website",
  storageBucket: "PASTE_YOUR_STORAGE_BUCKET",
  messagingSenderId: "PASTE_YOUR_MESSAGING_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};
const configured = firebaseConfig.apiKey !== "PASTE_YOUR_FIREBASE_WEB_API_KEY" &&
                  firebaseConfig.storageBucket !== "PASTE_YOUR_STORAGE_BUCKET" &&
                  firebaseConfig.appId !== "PASTE_YOUR_APP_ID";
let app, auth, db, storage;
if (configured) {
  app = initializeApp(firebaseConfig); auth = getAuth(app); db = getFirestore(app); storage = getStorage(app);
}
const $ = id => document.getElementById(id);
const state = { tab:"login", user:null, isAdmin:false, videos:[], category:"All", adminMode:false };
$("year").textContent = new Date().getFullYear();

function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2800)}
function openModal(id){$(id).classList.remove("hidden")}
function closeModal(id){$(id).classList.add("hidden")}
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>closeModal(b.dataset.close)));
document.querySelectorAll(".modal-backdrop").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)m.classList.add("hidden")}));
function requireConfig(){if(!configured){toast("Add your Firebase web config in app.js first.");return false}return true}
function usernameEmail(name){return name.trim().toLowerCase().replace(/[^a-z0-9._-]/g,"")+"@sasuke-vault.local"}
function showAuth(tab="login"){state.tab=tab;document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("selected",b.dataset.tab===tab));$("authTitle").innerHTML=tab==="signup"?'Create your <em>identity.</em>':'Enter the <em>vault.</em>';$("authSubmit").textContent=tab==="signup"?"Create account":"Unlock access";$("authError").textContent="";openModal("authModal")}
$("userOpen").addEventListener("click",()=>showAuth("login"));$("heroLogin").addEventListener("click",()=>showAuth("login"));$("bannerLogin").addEventListener("click",()=>showAuth("login"));$("unlockLibrary").addEventListener("click",()=>showAuth("login"));
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>showAuth(b.dataset.tab)));
$("adminOpen").addEventListener("click",()=>openModal("adminModal"));
const adminMenuOpen = $("adminMenuOpen");
if (adminMenuOpen) adminMenuOpen.addEventListener("click",()=>openModal("adminModal"));
$("authForm").addEventListener("submit",async e=>{e.preventDefault();if(!requireConfig())return;const name=$("username").value.trim(),pin=$("userPin").value;const email=usernameEmail(name);$("authError").textContent="";
try{if(state.tab==="signup"){await createUserWithEmailAndPassword(auth,email,pin)}else{await signInWithEmailAndPassword(auth,email,pin)}closeModal("authModal");toast("Access granted.");}catch(err){$("authError").textContent=authMessage(err.code)}});
$("adminForm").addEventListener("submit",async e=>{e.preventDefault();if(!requireConfig())return;const name=$("adminUsername").value.trim(),pass=$("adminPassword").value;$("adminError").textContent="";
try{await signInWithEmailAndPassword(auth,usernameEmail(name),pass);if(!state.isAdmin){await signOut(auth);$("adminError").textContent="This account is not approved for admin access.";return}closeModal("adminModal");openModal("adminPanel");renderAdminList();}catch(err){$("adminError").textContent=authMessage(err.code)}});
$("adminLogout").addEventListener("click",async()=>{if(auth)await signOut(auth);closeModal("adminPanel");toast("Logged out.")});
function authMessage(code){return ({ "auth/invalid-credential":"Username or password is incorrect.","auth/email-already-in-use":"That username is already taken.","auth/weak-password":"Use a password with at least 6 characters.","auth/invalid-email":"Please check the username.","auth/too-many-requests":"Too many attempts. Try again later."})[code]||"Could not sign in. Check your details and Firebase setup."}
onAuthStateChangedSafe();
async function onAuthStateChangedSafe(){if(!configured){$("lockedState").classList.remove("hidden");return}onAuthStateChanged(auth,async user=>{state.user=user;state.isAdmin=false;if(user){try{const adminDoc=await getDocs(collection(db,"admins"));state.isAdmin=adminDoc.docs.some(d=>d.id===user.uid)}catch(e){console.error(e)}if(!state.isAdmin){$("userOpen").textContent="Member active";$("adminOpen").textContent="Access"}else{$("userOpen").textContent="Member active";$("adminOpen").textContent="Admin"}$("lockedState").classList.add("hidden");await loadVideos()}else{$("userOpen").textContent="User login";$("adminOpen").textContent="Access";$("lockedState").classList.remove("hidden");$("videoGrid").classList.add("hidden");$("continue").classList.add("hidden");state.videos=[]}})}
async function loadVideos(){try{const snap=await getDocs(query(collection(db,"videos"),orderBy("createdAt","desc")));state.videos=snap.docs.map(d=>({id:d.id,...d.data()}));renderVideos();if(state.isAdmin)renderAdminList()}catch(e){console.error(e);toast("Could not load videos. Check Firestore rules.")}}
function filteredVideos(){const term=$("search").value.toLowerCase().trim(),genre=$("genreFilter").value;return state.videos.filter(v=>(!term||`${v.title} ${v.anime} ${v.genre}`.toLowerCase().includes(term))&&(!genre||v.genre===genre)&&(state.category==="All"||v.category===state.category||v.type===state.category))}
function renderVideos(){const grid=$("videoGrid"),items=filteredVideos();grid.innerHTML="";grid.classList.remove("hidden");$("emptyState").classList.toggle("hidden",items.length>0);for(const v of items){const card=document.createElement("article");card.className="video-card";const thumb=document.createElement("div");thumb.className="thumb";if(v.thumbnailUrl){const img=document.createElement("img");img.src=v.thumbnailUrl;img.alt=`${v.title} thumbnail`;thumb.append(img)}else{thumb.innerHTML='<div class="character-mark" style="font-size:90px;text-align:center;padding-top:36px">うちは</div>'}const tag=document.createElement("span");tag.className="video-tag";tag.textContent=v.type||"EPISODE";thumb.append(tag);const play=document.createElement("span");play.className="play-badge";play.textContent="▶";thumb.append(play);thumb.addEventListener("click",()=>playVideo(v));const info=document.createElement("div");info.className="video-info";const title=document.createElement("h3");title.textContent=v.title||"Untitled video";const sub=document.createElement("p");sub.textContent=`${v.anime||"Anime"} · ${v.genre||"Anime"}`;info.append(title,sub);const actions=document.createElement("div");actions.className="video-actions";const watch=document.createElement("button");watch.className="primary";watch.textContent="▶ Watch";watch.onclick=()=>playVideo(v);const dl=document.createElement("a");dl.className="outline";dl.textContent="↓ Save";dl.href=v.videoUrl||"#";dl.download=(v.title||"anime-video").replace(/[^a-z0-9-_ ]/gi,"")+".mp4";dl.target="_blank";actions.append(watch,dl);info.append(actions);card.append(thumb,info);grid.append(card)}}
function playVideo(v){if(!v.videoUrl){toast("Video file URL is missing.");return}$("player").src=v.videoUrl;$("playerTitle").textContent=v.title||"Anime video";$("playerSubtitle").textContent=`${v.anime||""} · ${v.genre||""}`;$("downloadVideo").href=v.videoUrl;$("downloadVideo").download=(v.title||"anime-video").replace(/[^a-z0-9-_ ]/gi,"")+".mp4";$("playerModal").classList.remove("hidden")}
document.querySelector('[data-close="playerModal"]').addEventListener("click",()=>{$("player").pause();$("player").removeAttribute("src");$("player").load();closeModal("playerModal")});
$("search").addEventListener("input",renderVideos);$("genreFilter").addEventListener("change",renderVideos);
document.querySelectorAll(".chip").forEach(b=>b.addEventListener("click",()=>{state.category=b.dataset.category;document.querySelectorAll(".chip").forEach(c=>c.classList.toggle("selected",c===b));renderVideos()}));
async function renderAdminList(){if(!state.isAdmin)return;const list=$("adminVideoList");list.innerHTML="";for(const v of state.videos){const row=document.createElement("div");row.className="admin-row";const label=document.createElement("span");label.textContent=`${v.title} — ${v.anime}`;const del=document.createElement("button");del.textContent="Delete";del.onclick=()=>deleteVideo(v);row.append(label,del);list.append(row)}if(!state.videos.length)list.textContent="No videos uploaded yet."}
async function deleteVideo(v){if(!state.isAdmin||!confirm(`Delete "${v.title}"?`))return;try{await deleteDoc(doc(db,"videos",v.id));if(v.storagePath)try{await deleteObject(ref(storage,v.storagePath))}catch(e){console.warn(e)}if(v.thumbnailPath)try{await deleteObject(ref(storage,v.thumbnailPath))}catch(e){console.warn(e)}toast("Video deleted.");await loadVideos()}catch(e){toast("Delete failed. Check admin rules.")}}
$("uploadForm").addEventListener("submit",async e=>{e.preventDefault();if(!state.user||!state.isAdmin){$("uploadStatus").textContent="Admin access required.";return}const file=$("videoFile").files[0];if(!file)return;if(!file.type.startsWith("video/")){$("uploadStatus").textContent="Choose a video file.";return}const btn=$("uploadForm").querySelector('button[type="submit"]');btn.disabled=true;$("uploadStatus").textContent="Preparing upload…";
try{const videoPath=`videos/${state.user.uid}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`,videoRef=ref(storage,videoPath);const task=uploadBytesResumable(videoRef,file);const videoUrl=await new Promise((resolve,reject)=>{task.on("state_changed",s=>{$("uploadStatus").textContent=`Uploading… ${Math.round(s.bytesTransferred/s.totalBytes*100)}%`},reject,async()=>resolve(await getDownloadURL(task.snapshot.ref)))});let thumbnailUrl=$("thumbnailUrl").value.trim(),thumbnailPath="";const thumbFile=$("thumbnailFile").files[0];if(thumbFile){thumbnailPath=`thumbnails/${state.user.uid}/${Date.now()}_${thumbFile.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;const tr=ref(storage,thumbnailPath);await uploadBytesResumable(tr,thumbFile);thumbnailUrl=await getDownloadURL(tr)}await addDoc(collection(db,"videos"),{title:$("videoTitle").value.trim(),anime:$("animeName").value.trim(),genre:$("videoGenre").value,type:$("videoType").value,category:"Recently Added",thumbnailUrl,thumbnailPath,videoUrl,storagePath:videoPath,createdAt:serverTimestamp(),createdBy:state.user.uid});$("uploadStatus").textContent="Upload complete.";toast("Video added to the vault.");$("uploadForm").reset();await loadVideos()}catch(err){console.error(err);$("uploadStatus").textContent="Upload failed. Check Storage rules, bucket config and file size."}finally{btn.disabled=false}});
