# Attribution & Credits

This document provides detailed attribution for all third-party components, models, and libraries used in X Timeline Curator.

## AI Model Attribution

### all-MiniLM-L6-v2 Sentence Transformer Model

**Model**: [sentence-transformers/all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)  
**Created by**: Nils Reimers and Iryna Gurevych  
**Organization**: [Sentence Transformers](https://www.sbert.net/)  
**License**: Apache License 2.0  
**Model Card**: https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2  

**Usage in this project**: 
- Downloaded locally for semantic similarity calculations
- Used to generate 384-dimensional embeddings for text classification
- Enables privacy-preserving local AI inference
- Model size: ~22MB (quantized ONNX format)

**Academic Citation**:
```bibtex
@inproceedings{reimers-2019-sentence-bert,
    title = "Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks",
    author = "Reimers, Nils and Gurevych, Iryna",
    booktitle = "Proceedings of the 2019 Conference on Empirical Methods in Natural Language Processing",
    month = nov,
    year = "2019",
    address = "Hong Kong, China",
    publisher = "Association for Computational Linguistics",
    url = "https://aclanthology.org/D19-1410",
    doi = "10.18653/v1/D19-1410",
    pages = "3982--3992",
}
```

## AI Infrastructure

### Transformers.js Library

**Library**: [🤗 Transformers.js](https://huggingface.co/docs/transformers.js)  
**Created by**: Hugging Face Team  
**Organization**: [Hugging Face](https://huggingface.co/)  
**License**: Apache License 2.0  
**Repository**: https://github.com/xenova/transformers.js  
**Documentation**: https://huggingface.co/docs/transformers.js  

**Usage in this project**:
- JavaScript library for running transformer models in web browsers
- Enables client-side AI inference without server dependencies
- Provides ONNX Runtime Web backend for efficient model execution
- Handles model downloading, caching, and inference pipeline

**Special Thanks**: To the Hugging Face team for democratizing AI and making transformer models accessible in JavaScript environments.

### Hugging Face Hub

**Platform**: [Hugging Face Hub](https://huggingface.co/)  
**Service**: Model hosting and distribution  
**Usage**: CDN for downloading the all-MiniLM-L6-v2 model files  

**Endpoints used**:
- `https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/`
- Model files: `config.json`, `tokenizer.json`, `onnx/model_quantized.onnx`

## Technical Dependencies

### Runtime Dependencies

#### ONNX Runtime Web
**Library**: ONNX Runtime Web (bundled with Transformers.js)  
**Organization**: Microsoft and ONNX Community  
**License**: MIT License  
**Usage**: WebAssembly backend for efficient model inference

#### Chrome Extensions API
**Platform**: Google Chrome Extensions API  
**Documentation**: https://developer.chrome.com/docs/extensions/  
**Usage**: Extension framework, storage, messaging, and DOM manipulation

### Development Dependencies

#### Jest Testing Framework
**Library**: [Jest](https://jestjs.io/)  
**Organization**: Meta (Facebook)  
**License**: MIT License  
**Usage**: Unit testing and test suite execution

#### JSDOM
**Library**: [JSDOM](https://github.com/jsdom/jsdom)  
**License**: MIT License  
**Usage**: DOM simulation for testing in Node.js environment

#### Babel
**Library**: [@babel/preset-env](https://babeljs.io/)  
**Organization**: Babel Team  
**License**: MIT License  
**Usage**: JavaScript transpilation for ES module support in tests

## License Compliance

### Apache License 2.0 Components
- **all-MiniLM-L6-v2 model**: Used under Apache License 2.0
- **Transformers.js library**: Used under Apache License 2.0

**Compliance**: This project complies with Apache License 2.0 by:
- Providing proper attribution (this file)
- Not modifying the original works
- Using them for their intended purpose
- Including license notices where required

### MIT License Components
- **Project code**: Released under MIT License
- **Development dependencies**: Various MIT-licensed tools

## Fair Use Statement

This extension downloads and uses the all-MiniLM-L6-v2 model under Apache License 2.0 for semantic text analysis. The model is:
- Used as-is without modification
- Used for its intended purpose (sentence embeddings)
- Downloaded once and cached locally
- Never redistributed or modified

## Privacy & Data Protection

**Local Processing**: All AI inference happens locally on the user's device. No user data, tweets, or personal information is sent to external servers after the initial model download.

**Model Download**: The model is downloaded once from Hugging Face's CDN and cached locally in the browser's IndexedDB. This is similar to downloading any other resource from the web.

**No Telemetry**: This extension does not collect usage statistics, analytics, or any user data.

## Commercial Use

The Apache License 2.0 permits commercial use of the all-MiniLM-L6-v2 model. This extension can be used commercially while maintaining proper attribution as provided in this document.

## Updates & Changes

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Maintainer**: X Timeline Curator Contributors  

If you notice any attribution errors or have questions about licensing, please open an issue at: https://github.com/Shantykins/X-Timeline-Curator/issues

---

**Thank you** to all the open-source contributors, researchers, and organizations that made this project possible! 🙏