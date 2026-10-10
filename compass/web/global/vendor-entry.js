// Firebase modular SDK functions used by src/store/firebase.js, exposed as window.FB (bundled by build.mjs with esbuild).
import { initializeApp } from 'firebase/app';
import {
  getAuth, connectAuthEmulator, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail, signOut, reauthenticateWithCredential, EmailAuthProvider, deleteUser
} from 'firebase/auth';
import {
  getFirestore, connectFirestoreEmulator, collection, doc, query, where, onSnapshot, setDoc, deleteDoc, getDoc, getDocs, writeBatch
} from 'firebase/firestore';

window.FB = {
  initializeApp, getAuth, connectAuthEmulator, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail, signOut, reauthenticateWithCredential, EmailAuthProvider, deleteUser,
  getFirestore, connectFirestoreEmulator, collection, doc, query, where, onSnapshot, setDoc, deleteDoc, getDoc, getDocs, writeBatch
};
