'use client';

import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Initiates a setDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function setDocumentNonBlocking(
  docRef: DocumentReference,
  data: any,
  options?: SetOptions
) {
  const promise = options
    ? setDoc(docRef, data, options)
    : setDoc(docRef, data);

  promise.catch(error => {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: docRef.path,
        operation: 'write',
        requestResourceData: data,
      })
    );
  });
  // Execution continues immediately
}

/**
 * Initiates an addDoc or setDoc operation depending on reference type.
 * Does NOT await the write operation internally.
 * Returns the Promise for the new doc ref, but typically not awaited by caller.
 */
export function addDocumentNonBlocking(
  colRefOrDocRef: CollectionReference | DocumentReference,
  data: any,
  options?: SetOptions
) {
  const isDocRef = (colRefOrDocRef as any).type === 'document';

  const promise = isDocRef
    ? (options
        ? setDoc(colRefOrDocRef as DocumentReference, data, options)
        : setDoc(colRefOrDocRef as DocumentReference, data))
    : addDoc(colRefOrDocRef as CollectionReference, data);

  promise.catch(error => {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: colRefOrDocRef.path,
        operation: isDocRef ? 'write' : 'create',
        requestResourceData: data,
      })
    );
  });

  return promise;
}

/**
 * Initiates an updateDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function updateDocumentNonBlocking(docRef: DocumentReference, data: any) {
  updateDoc(docRef, data).catch(error => {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: data,
      })
    );
  });
}

/**
 * Initiates a deleteDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function deleteDocumentNonBlocking(docRef: DocumentReference) {
  deleteDoc(docRef).catch(error => {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      })
    );
  });
}