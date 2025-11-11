import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function MesSyllabesMots() {
    const router = useRouter()

    useEffect(() => {
        // Redirection automatique vers la nouvelle page
        router.replace('/lire/mes-syllabes-mots-new')
    }, [router])

    return null
}
