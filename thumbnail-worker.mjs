import {parentPort,workerData} from 'node:worker_threads';
import {createCanvas} from '@napi-rs/canvas';
import {renderThumbnails} from './thumbnail-renderer.mjs';
parentPort.postMessage(renderThumbnails(workerData,()=>createCanvas(1280,720)));
