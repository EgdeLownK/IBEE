import { ImageResponse } from 'next/og'
import { loadPublicProfileBySlug } from '@/lib/load-public-profile'

export const alt = 'Profil sur IBEE'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const revalidate = 86400

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await loadPublicProfileBySlug(slug)

  if (!data) {
    return new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          fontSize: '64px',
          fontWeight: 'bold',
        }}
      >
        IBEE
      </div>,
      { ...size },
    )
  }

  const { entity } = data

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0F172A',
        position: 'relative',
      }}
    >
      {entity.banner_url && (
        <img
          src={entity.banner_url}
          alt=""
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '315px',
            objectFit: 'cover',
          }}
        />
      )}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: entity.banner_url ? '100px' : '0',
          zIndex: 10,
        }}
      >
        {entity.avatar_url ? (
          <img
            src={entity.avatar_url}
            alt=""
            style={{
              width: '200px',
              height: '200px',
              borderRadius: '100px',
              border: '8px solid white',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              width: '200px',
              height: '200px',
              borderRadius: '100px',
              backgroundColor: '#E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '72px',
              color: '#475569',
              border: '8px solid white',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            {entity.display_name.charAt(0).toUpperCase()}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: entity.banner_url ? 'rgba(15, 23, 42, 0.85)' : 'transparent',
            padding: '20px 40px',
            borderRadius: '24px',
            marginTop: '20px',
          }}
        >
          <h1
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: 'white',
              margin: '0',
              textAlign: 'center',
              letterSpacing: '-0.02em',
            }}
          >
            {entity.display_name}
          </h1>
          {entity.role && (
            <p
              style={{
                fontSize: '36px',
                color: '#94A3B8',
                marginTop: '10px',
                marginBottom: '0',
                textAlign: 'center',
              }}
            >
              {entity.role}
            </p>
          )}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '40px',
          display: 'flex',
          alignItems: 'center',
          color: 'white',
          fontSize: '32px',
          fontWeight: 'bold',
          letterSpacing: '0.1em',
        }}
      >
        IBEE
      </div>
    </div>,
    { ...size },
  )
}
