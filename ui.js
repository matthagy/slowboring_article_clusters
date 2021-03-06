(($) => {
    const postsMap = {};
    let clusters;
    let rp = 25;
    let selectClusters;
    let curSortName = 'date';
    let curSortOrder = "asc";

    function wireUI() {
        window._clusterData['posts'].forEach(post => {
            postsMap[post["id"] + ''] = post;
            post['link_title'] = '<a href="' + post['url'] + '" target="_blank">' + post['title'] + '</a>'
        });

        clusters = window._clusterData['clusters'];

        const categoriesSelect = $('#categories');
        clusters.forEach(clusters => {
            const size = clusters['clusters'].length + '';
            categoriesSelect.append($('<option>', {
                value: size,
                text: size
            }));
        });
        categoriesSelect.change((event) => {
            selectNumCategories(+event.target.value);
        });

        const categorySelect = $('#category');
        categorySelect.change((event) => {
            selectCategory(+event.target.value);
        });

        $('#clusterPosts').flexigrid({
            width: 1050,
            height: 'auto',
            striped: true,
            dataType: 'json',
            onRpChange: (newRp) => {
                rp = newRp;
                $('#clusterPosts').flexOptions({rp: rp});
                updateData();
            },
            onChangePage: (page) => {
                updateData(page);
            },
            onChangeSort: sortRecords,
            onSubmit: () => {
                return false
            },
            usepager: true,
            rp: rp,
            colResize: false,
            colMove: false,
            showToggleBtn: false,
            resizable: false,
            rpOptions: [10, 25, 50, 100, 500],
            searchitems: false,
            sortname: curSortName,
            sortorder: curSortOrder,
            colModel: [
                {
                    "display": "Date",
                    "name": "date",
                    "width": 80,
                    "sortable": true,
                    "align": "left"
                },
                {
                    "display": "Audience",
                    "name": "audience",
                    "width": 60,
                    "sortable": true,
                    "align": "left"
                },
                {
                    "display": "Comments",
                    "name": "comments",
                    "width": 60,
                    "sortable": true,
                    "align": "left"
                },
                {
                    "display": "Likes",
                    "name": "likes",
                    "width": 40,
                    "sortable": true,
                    "align": "left"
                },
                {
                    "display": "Word Count",
                    "name": "word_count",
                    "width": 60,
                    "sortable": true,
                    "align": "left"
                },
                {
                    "display": "Authors",
                    "name": "authors",
                    "width": 100,
                    "sortable": true,
                    "align": "left"
                },
                {
                    "display": "Title",
                    "name": "link_title",
                    "width": 560,
                    "sortable": true,
                    "align": "left"
                }
            ]
        });

        categoriesSelect.val(20).change();
    }


    function selectNumCategories(numCategories) {
        for (const c of clusters) {
            if (c['clusters'].length === numCategories) {
                selectClusters = c['clusters'];
                break;
            }
        }
        if (selectClusters === null) {
            console.log("failed to find cluster " + numCategories);
            return;
        }

        const categorySelect = $('#category');
        categorySelect.empty();
        for (let i = 0; i < selectClusters.length; i++) {
            const cluster = selectClusters[i];
            categorySelect.append($('<option>', {
                value: i,
                text: "n=" + cluster['postIds'].length + " : " + cluster['topTerms'].slice(0, 10).map(x => x[0]).join(', ')
            }));
        }
        categorySelect.val(0).change();
    }

    let clusterPosts;

    function selectCategory(index) {
        const cluster = selectClusters[index];
        clusterPosts = cluster['postIds'].map(postId => postsMap[postId]);
        sortRecords(curSortName, curSortOrder);
    }

    function updateData(page) {
        if (typeof page === "undefined") {
            page = 1;
        }
        $('#clusterPosts').flexAddData({
                rows: clusterPosts.slice((page - 1) * rp, page * rp),
                page: page,
                total: clusterPosts.length,
            }
        );
    }

    function sortRecords(sortName, sortOrder) {
        if (sortName === 'link_title') {
            sortName = 'title';
        }
        curSortName = sortName;
        curSortOrder = sortOrder;
        clusterPosts.sort((a, b) => {
            const va = a[sortName];
            const vb = b[sortName];
            if (va === vb) {
                return 0;
            }
            const order = sortOrder === "asc" ? va < vb : va > vb;
            return order ? 1 : -1;
        })
        updateData();
    }

    $(document).ready(wireUI);
})(jQuery);
