import { FileBlob, PresentationFile } from '@oai/artifact-tool';
const deck = await PresentationFile.importPptx(await FileBlob.load('C:/Users/adity/OneDrive/Desktop/ENDSEM/JAVA/SK/.ppt-build/source-template.pptx'));
const result = await deck.inspect({kind:'slide,textbox,shape,image,table,chart,notes,layout', maxChars:50000});
console.log(result.ndjson);
