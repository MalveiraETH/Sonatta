import React from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const MODULES = {
  toolbar: [['bold', 'italic', 'underline'], [{ align: [] }], ['clean']],
};

export default function LayoutTextField({ value, onChange, placeholder, readOnly }) {
  return (
    <div className="doc-layout-editor h-full">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={MODULES}
        readOnly={readOnly}
        placeholder={placeholder}
      />
    </div>
  );
}