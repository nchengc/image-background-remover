// @vitest-environment jsdom
/**
 * 组件行为测试（jsdom + @testing-library/react）。
 *
 * 只测「用户可观察的行为」，不测样式类名细节：
 * - Uploader：点击 / 拖拽 / 粘贴三入口、非法文件就地报错、disabled 拦截
 * - StatusBlock：loading 提示、error 文案与错误码、retryable 决定按钮组合
 * - ResultView：三视图切换、下载链接与文件名、原图缺失时降级
 */

import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ResultView from '@/components/ResultView';
import StatusBlock from '@/components/StatusBlock';
import Uploader from '@/components/Uploader';
import { ALLOWED_MAX_BYTES } from '@/lib/useRemoveBg';

type UrlWithObjectApi = {
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
};

beforeEach(() => {
  // jsdom 不实现 objectURL，组件里用到时需要桩
  const target = URL as unknown as UrlWithObjectApi;
  target.createObjectURL = () => 'blob:stub';
  target.revokeObjectURL = () => undefined;
});

afterEach(() => {
  cleanup();
});

function makeFile(name: string, type: string, size = 2048): File {
  return new File([new Uint8Array(size)], name, { type });
}

function getFileInput(): HTMLInputElement {
  const input = document.querySelector('input[type="file"]');
  if (!input) {
    throw new Error('未找到文件输入框');
  }
  return input as HTMLInputElement;
}

describe('Uploader', () => {
  it('渲染上传提示、格式与体积说明', () => {
    render(<Uploader onSelect={vi.fn()} />);

    expect(screen.getByText(/点击上传/)).toBeInTheDocument();
    expect(screen.getByText(/JPG \/ PNG \/ WebP/)).toBeInTheDocument();
    expect(screen.getByText(/10\.00 MB/)).toBeInTheDocument();
  });

  it('选择合法图片时回调 onSelect', () => {
    const onSelect = vi.fn();
    render(<Uploader onSelect={onSelect} />);

    const file = makeFile('cat.png', 'image/png');
    fireEvent.change(getFileInput(), { target: { files: [file] } });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(file);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('选择后清空 input.value，保证同一文件可再次触发', () => {
    render(<Uploader onSelect={vi.fn()} />);
    const input = getFileInput();

    fireEvent.change(input, { target: { files: [makeFile('cat.png', 'image/png')] } });
    expect(input.value).toBe('');
  });

  it('非法格式就地报错且不进入状态机', () => {
    const onSelect = vi.fn();
    render(<Uploader onSelect={onSelect} />);

    fireEvent.change(getFileInput(), { target: { files: [makeFile('a.gif', 'image/gif')] } });

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/不支持的格式/);
  });

  it('超大文件就地报错', () => {
    const onSelect = vi.fn();
    render(<Uploader onSelect={onSelect} />);

    fireEvent.change(getFileInput(), {
      target: { files: [makeFile('big.png', 'image/png', ALLOWED_MAX_BYTES + 1)] },
    });

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/10MB/);
  });

  it('重新选择合法文件后清除旧错误提示', () => {
    const onSelect = vi.fn();
    render(<Uploader onSelect={onSelect} />);
    const input = getFileInput();

    fireEvent.change(input, { target: { files: [makeFile('a.gif', 'image/gif')] } });
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.change(input, { target: { files: [makeFile('b.png', 'image/png')] } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('拖拽合法图片触发 onSelect', () => {
    const onSelect = vi.fn();
    render(<Uploader onSelect={onSelect} />);
    const dropZone = screen.getByRole('button');
    const file = makeFile('drop.webp', 'image/webp');

    fireEvent.drop(dropZone, { dataTransfer: { files: [file], items: [] } });

    expect(onSelect).toHaveBeenCalledWith(file);
  });

  it('拖拽非法文件就地报错', () => {
    const onSelect = vi.fn();
    render(<Uploader onSelect={onSelect} />);

    fireEvent.drop(screen.getByRole('button'), {
      dataTransfer: { files: [makeFile('a.pdf', 'application/pdf')], items: [] },
    });

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('拖拽空 dataTransfer 提示未读取到图片', () => {
    render(<Uploader onSelect={vi.fn()} />);

    fireEvent.drop(screen.getByRole('button'), { dataTransfer: { files: [], items: [] } });

    expect(screen.getByRole('alert')).toHaveTextContent(/没有读取到图片/);
  });

  it('Ctrl+V 粘贴图片触发 onSelect', () => {
    const onSelect = vi.fn();
    render(<Uploader onSelect={onSelect} />);
    const file = makeFile('paste.png', 'image/png');

    const event = new Event('paste', { bubbles: true, cancelable: true }) as Event & {
      clipboardData?: unknown;
    };
    Object.defineProperty(event, 'clipboardData', {
      value: {
        items: [
          { kind: 'string', type: 'text/plain', getAsFile: () => null },
          { kind: 'file', type: 'image/png', getAsFile: () => file },
        ],
      },
    });
    window.dispatchEvent(event);

    expect(onSelect).toHaveBeenCalledWith(file);
  });

  it('粘贴纯文本不触发上传', () => {
    const onSelect = vi.fn();
    render(<Uploader onSelect={onSelect} />);

    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', {
      value: { items: [{ kind: 'string', type: 'text/plain', getAsFile: () => null }] },
    });
    window.dispatchEvent(event);

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('disabled 时禁用输入框、移出 tab 序列并标记 aria-disabled', () => {
    render(<Uploader onSelect={vi.fn()} disabled />);

    expect(getFileInput()).toBeDisabled();
    const dropZone = screen.getByRole('button');
    expect(dropZone).toHaveAttribute('aria-disabled', 'true');
    expect(dropZone).toHaveAttribute('tabindex', '-1');
  });

  it('disabled 时拖拽与粘贴都不触发 onSelect', () => {
    const onSelect = vi.fn();
    render(<Uploader onSelect={onSelect} disabled />);

    fireEvent.drop(screen.getByRole('button'), {
      dataTransfer: { files: [makeFile('cat.png', 'image/png')], items: [] },
    });

    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', {
      value: { items: [{ kind: 'file', type: 'image/png', getAsFile: () => makeFile('c.png', 'image/png') }] },
    });
    window.dispatchEvent(event);

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('disabled 时点击不打开文件选择器', () => {
    render(<Uploader onSelect={vi.fn()} disabled />);
    const clickSpy = vi.spyOn(getFileInput(), 'click');

    fireEvent.click(screen.getByRole('button'));

    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('回车键打开文件选择器（键盘可达性）', () => {
    render(<Uploader onSelect={vi.fn()} />);
    const clickSpy = vi.spyOn(getFileInput(), 'click');

    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });

    expect(clickSpy).toHaveBeenCalled();
  });
});

describe('StatusBlock / loading', () => {
  const baseProps = {
    error: null,
    originalUrl: null,
    fileName: '',
    onRetry: vi.fn(),
    onReset: vi.fn(),
  };

  it('展示处理中文案并标记 aria-busy', () => {
    const { container } = render(<StatusBlock {...baseProps} status="loading" />);

    expect(screen.getByText('正在去除背景…')).toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('有原图时展示缩略图占位', () => {
    render(<StatusBlock {...baseProps} status="loading" originalUrl="blob:original" />);

    const thumb = screen.getByAltText('待处理的原图缩略图');
    expect(thumb).toHaveAttribute('src', 'blob:original');
  });

  it('展示当前文件名，无文件名时给出耗时预期', () => {
    render(<StatusBlock {...baseProps} status="loading" fileName="cat.png" />);
    expect(screen.getByText('处理中：cat.png')).toBeInTheDocument();

    cleanup();
    render(<StatusBlock {...baseProps} status="loading" />);
    expect(screen.getByText(/3~10 秒/)).toBeInTheDocument();
  });

  it('loading 态不显示任何操作按钮（防误触）', () => {
    render(<StatusBlock {...baseProps} status="loading" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('StatusBlock / error', () => {
  const baseProps = {
    originalUrl: null,
    fileName: 'cat.png',
    onRetry: vi.fn(),
    onReset: vi.fn(),
  };

  it('可重试错误：同时显示「重试」和「换一张图片」', () => {
    render(
      <StatusBlock
        {...baseProps}
        status="error"
        error={{ code: 'PROVIDER_ERROR', message: '去背景服务暂时不可用，请稍后重试', retryable: true }}
      />,
    );

    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '换一张图片' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('去背景服务暂时不可用，请稍后重试');
    expect(screen.getByText('错误码：PROVIDER_ERROR')).toBeInTheDocument();
  });

  it.each([
    ['INVALID_INPUT', '上传内容有误，请重新选择图片'],
    ['UNSUPPORTED_TYPE', '不支持的图片格式'],
    ['UPLOAD_TOO_LARGE', '图片超过 10MB，请压缩后重试'],
  ])('不可重试错误 %s：只显示「换一张图片」', (code, message) => {
    render(
      <StatusBlock
        {...baseProps}
        status="error"
        error={{ code, message, retryable: false }}
      />,
    );

    expect(screen.queryByRole('button', { name: '重试' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '换一张图片' })).toBeInTheDocument();
  });

  it('点击「重试」触发 onRetry，点击「换一张图片」触发 onReset', () => {
    const onRetry = vi.fn();
    const onReset = vi.fn();
    render(
      <StatusBlock
        {...baseProps}
        status="error"
        error={{ code: 'TIMEOUT', message: '处理超时，请稍后重试', retryable: true }}
        onRetry={onRetry}
        onReset={onReset}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '重试' }));
    fireEvent.click(screen.getByRole('button', { name: '换一张图片' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('error 为 null 时兜底文案，且不显示重试', () => {
    render(<StatusBlock {...baseProps} status="error" error={null} />);

    expect(screen.getByRole('alert')).toHaveTextContent('未知错误，请重试');
    expect(screen.queryByRole('button', { name: '重试' })).not.toBeInTheDocument();
  });
});

describe('ResultView', () => {
  const baseProps = {
    resultUrl: 'blob:result',
    originalUrl: 'blob:original',
    fileName: 'my cat.jpg',
    resultSize: 204_800,
    onReset: vi.fn(),
  };

  it('默认展示去背景结果，下载链接指向结果并使用 _nobg.png 命名', () => {
    render(<ResultView {...baseProps} />);

    const link = screen.getByRole('link', { name: /下载透明 PNG/ });
    expect(link).toHaveAttribute('href', 'blob:result');
    expect(link).toHaveAttribute('download', 'my cat_nobg.png');
    expect(screen.getByAltText('去除背景后的透明 PNG')).toBeInTheDocument();
  });

  it('展示文件名、体积与透明底说明', () => {
    render(<ResultView {...baseProps} />);
    expect(screen.getByText(/my cat_nobg\.png · 200 KB · 透明底 PNG/)).toBeInTheDocument();
  });

  it('resultSize 为 0 时不展示体积', () => {
    render(<ResultView {...baseProps} resultSize={0} />);
    expect(screen.getByText(/my cat_nobg\.png · 透明底 PNG/)).toBeInTheDocument();
  });

  it('提供 去背景 / 原图 / 对比 三个视图切换', () => {
    render(<ResultView {...baseProps} />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['去背景', '原图', '对比']);
    expect(screen.getByRole('tab', { name: '去背景' })).toHaveAttribute('aria-selected', 'true');
  });

  it('切到「原图」展示原图且不铺棋盘格', () => {
    render(<ResultView {...baseProps} />);

    fireEvent.click(screen.getByRole('tab', { name: '原图' }));

    const img = screen.getByAltText('原始图片');
    expect(img).toHaveAttribute('src', 'blob:original');
    expect(screen.queryByAltText('去除背景后的透明 PNG')).not.toBeInTheDocument();
  });

  it('切到「对比」并排展示原图与结果', () => {
    render(<ResultView {...baseProps} />);

    fireEvent.click(screen.getByRole('tab', { name: '对比' }));

    expect(screen.getByAltText('原始图片')).toHaveAttribute('src', 'blob:original');
    expect(screen.getByAltText('去除背景后的透明 PNG')).toHaveAttribute('src', 'blob:result');
  });

  it('切换视图后下载链接始终指向结果图（不会误下原图）', () => {
    render(<ResultView {...baseProps} />);

    fireEvent.click(screen.getByRole('tab', { name: '原图' }));

    expect(screen.getByRole('link', { name: /下载透明 PNG/ })).toHaveAttribute('href', 'blob:result');
  });

  it('原图缺失时隐藏切换器并只显示结果', () => {
    render(<ResultView {...baseProps} originalUrl={null} />);

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.getByAltText('去除背景后的透明 PNG')).toBeInTheDocument();
  });

  it('点击「再处理一张」触发 onReset', () => {
    const onReset = vi.fn();
    render(<ResultView {...baseProps} onReset={onReset} />);

    fireEvent.click(screen.getByRole('button', { name: '再处理一张' }));

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('空文件名时下载名兜底为 image_nobg.png', () => {
    render(<ResultView {...baseProps} fileName="" />);
    expect(screen.getByRole('link', { name: /下载透明 PNG/ })).toHaveAttribute(
      'download',
      'image_nobg.png',
    );
  });
});
