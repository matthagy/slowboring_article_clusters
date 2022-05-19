import json
from typing import Collection, Any

import pandas as pd
import scipy.io
from scipy.sparse import csr_matrix
from sklearn.cluster import MiniBatchKMeans
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import TfidfTransformer
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import Normalizer

N_COMPONENTS = 20
N_CLUSTERS = [1, 5, 10, 15, 20, 30, 40]


def main():
    posts: pd.DataFrame = pd.read_csv('data/posts.csv')
    post_records = create_post_records(posts)

    X: csr_matrix = scipy.io.mmread('data/word_counts.mtx').tocsr()
    print(f'vectorized {X=}')

    words: pd.Series = pd.read_csv('data/words.csv')['word']

    X_tfidf: csr_matrix = TfidfTransformer().fit_transform(X)

    svd = TruncatedSVD(N_COMPONENTS)
    normalizer = Normalizer(copy=True)
    lsa = make_pipeline(svd, normalizer)
    X_lsa = lsa.fit_transform(X_tfidf)
    print(f'SVD variance {svd.explained_variance_ratio_.sum()}')

    clusters = [fit_clusters(n_clusters, posts['post_id'], X_lsa, svd, words)
                for n_clusters in N_CLUSTERS]
    data = {
        'posts': post_records,
        'clusters': clusters
    }
    with open('clusters.js', 'wt') as fp:
        fp.write('window._clusterData = ')
        json.dump(data, fp, indent=2)
        fp.write(';\n')


def create_post_records(posts) -> list[dict[str, Any]]:
    return (posts
            .assign(date=lambda x: pd.to_datetime(x['date']).dt.date.map(str))
            .rename(columns={'post_id': 'id'})
            .apply(lambda row: dict(row.items()), axis=1)
            .pipe(list))


def fit_clusters(n_clusters: int, post_ids: Collection[int], X_lsa: csr_matrix, svd: TruncatedSVD,
                 feature_names: Collection[str]) -> dict[str, Any]:
    print(f'clustering {n_clusters=}')
    km = MiniBatchKMeans(
        n_clusters=n_clusters,
        init="k-means++",
        n_init=1,
        init_size=1000,
        batch_size=1000,
        verbose=0,
    )
    km.fit(X_lsa)
    original_space_centroids = pd.DataFrame(svd.inverse_transform(km.cluster_centers_),
                                            columns=feature_names)
    cluster_labels = pd.Series(km.labels_, index=post_ids, name='cluster')
    cluster_counts = cluster_labels.value_counts()
    json_clusters = []
    for cluster, n in cluster_counts.items():
        key_terms = (original_space_centroids
                     .iloc[cluster]
                     .sort_values(ascending=False)
                     .mul(1000)
                     .round()
                     .astype(int))
        json_clusters.append({
            'topTerms': terms_to_list(key_terms.head(15)),
            'lowTerms': terms_to_list(key_terms.tail(15)),
            'postIds': list(cluster_labels[cluster_labels == cluster].index)
        })

    return {
        'clusters': json_clusters,
    }


def terms_to_list(terms: pd.Series) -> list[list]:
    return [[term, freq] for term, freq in terms.items()]


__name__ == '__main__' and main()
