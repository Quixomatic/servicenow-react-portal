import * as React from 'react';
import { ImageOffIcon } from 'lucide-react';
import { cn } from 'cn';

// components:image: an <img> with a loading placeholder and a fallback (Next Experience's
// now-image), so a broken or slow attachment never shows the browser's broken-image icon.
//
//   <Image src={url} alt="Router diagram" aspectRatio="16 / 9" className="rounded-lg" />
//   <Image src={photo} alt="" fallback={<Icon name="user" />} fit="contain" />
//
// Props: src, alt (required: '' for decorative), aspectRatio (CSS value; reserves the space),
// fit ('cover' | 'contain' | 'fill' | 'none'), fallback (element; default an "image unavailable"
// icon with sr-only text), fallbackSrc (tried once before the fallback), placeholder
// ('skeleton' (default) | 'none'), loading ('lazy' default), onStatusChange('loading' | 'loaded'
// | 'error'). Other props go to the <img>. useImageStatus(src) is the loader on its own.

/** 'idle' | 'loading' | 'loaded' | 'error' for a URL, without rendering it. */
function useImageStatus(src) {
    const [status, setStatus] = React.useState(src ? 'loading' : 'idle');
    React.useEffect(() => {
        if (!src) {
            setStatus('idle');
            return undefined;
        }
        let alive = true;
        setStatus('loading');
        const img = new window.Image();
        img.onload = () => alive && setStatus('loaded');
        img.onerror = () => alive && setStatus('error');
        img.src = src;
        return () => {
            alive = false;
        };
    }, [src]);
    return status;
}

const FIT = { cover: 'object-cover', contain: 'object-contain', fill: 'object-fill', none: 'object-none' };

function Image({
    className,
    imgClassName,
    src,
    alt,
    aspectRatio,
    fit = 'cover',
    fallback,
    fallbackSrc,
    placeholder = 'skeleton',
    loading = 'lazy',
    onStatusChange,
    style,
    width,
    height,
    ...props
}) {
    const [current, setCurrent] = React.useState(src);
    const [status, setStatus] = React.useState(src ? 'loading' : 'error');
    React.useEffect(() => {
        setCurrent(src);
        setStatus(src ? 'loading' : 'error');
    }, [src]);
    const update = (next) => {
        setStatus(next);
        if (onStatusChange) onStatusChange(next);
    };
    const failed = status === 'error';
    return (
        <span
            data-slot="image"
            data-status={status}
            className={cn(
                'relative inline-flex overflow-hidden bg-muted/40',
                !aspectRatio && !width && 'max-w-full',
                className
            )}
            style={Object.assign({ aspectRatio: aspectRatio || undefined, width, height }, style || {})}
        >
            {!failed ? (
                <img
                    src={current}
                    alt={alt}
                    loading={loading}
                    width={width}
                    height={height}
                    onLoad={() => update('loaded')}
                    onError={() => {
                        if (fallbackSrc && current !== fallbackSrc) setCurrent(fallbackSrc);
                        else update('error');
                    }}
                    className={cn(
                        'block transition-opacity duration-200',
                        aspectRatio || width || height ? 'size-full' : 'h-auto max-w-full',
                        FIT[fit] || FIT.cover,
                        status === 'loaded' ? 'opacity-100' : 'opacity-0',
                        imgClassName
                    )}
                    {...props}
                />
            ) : null}
            {status === 'loading' && placeholder === 'skeleton' ? (
                <span aria-hidden="true" className="absolute inset-0 animate-pulse bg-muted" />
            ) : null}
            {failed ? (
                <span
                    role={alt ? 'img' : undefined}
                    aria-label={alt ? `${alt} (image unavailable)` : undefined}
                    aria-hidden={alt ? undefined : 'true'}
                    className="flex size-full min-h-8 min-w-8 items-center justify-center text-muted-foreground [&_svg]:size-5"
                >
                    {fallback || <ImageOffIcon aria-hidden="true" />}
                </span>
            ) : null}
        </span>
    );
}

export { Image, useImageStatus };
